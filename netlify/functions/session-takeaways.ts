import type { Handler } from '@netlify/functions';

/**
 * Generates 2-4 bullet-point takeaways from a finished study session.
 *
 * Body: { wrong: WrongAtom[], right: RightAtom[] }
 * Response: { bullets: string[] } | { error: string }
 *
 * Prefers `OPENAI_TTS_KEY` (already a real OpenAI key in this project) →
 * falls back to `VITE_OPENAI_API_KEY` (DeepSeek) → 503 if neither is
 * configured. Same proxy pattern as `tts.ts`. Frontend renders nothing
 * on 503, so soft-fails cleanly.
 *
 * Cost: ~$0.001 per call (a few hundred tokens in, ~100 out).
 */

interface WrongAtom { stem: string; answer: string; topicPath: string[] }
interface RightAtom { stem: string; topicPath: string[] }

const SYSTEM_PROMPT = `You are a UK clinician-tutor reviewing a UKMLA study session. Identify 2-4 specific takeaways the student should focus on next time, based on which questions they got wrong.

Output STRICT JSON of shape: { "bullets": ["…", "…"] }

Each bullet:
- ONE sentence, plain readable English (UK).
- Concrete and actionable. Cite the underlying clinical pattern, NOT individual question facts. Examples:
  - "First-line antihypertensives split by age and ethnicity — under 55 non-Black: ACEi; over 55 or Black: CCB."
  - "ECG: irregularly irregular = AF; sawtooth = atrial flutter; long PR with dropped beats = Mobitz."
- Group related misses if they share a theme.
- For all-correct sessions, return ONE bullet congratulating + suggesting the next topic to drill.
- NEVER quote verbatim from any source. Original paraphrased prose.

Return JSON ONLY.`;

const userPrompt = (wrong: WrongAtom[], right: RightAtom[]) => {
  const wrongLines = wrong.length === 0
    ? '(none — all correct)'
    : wrong.map((w, i) => `${i + 1}. [${(w.topicPath ?? []).join(' > ')}] ${w.stem}\n   Correct answer: ${w.answer}`).join('\n');
  const summary = `Session: ${right.length} correct, ${wrong.length} wrong.`;
  return `${summary}\n\nWrong picks:\n${wrongLines}\n\nWrite the JSON takeaways.`;
};

const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  let parsed: { wrong?: WrongAtom[]; right?: RightAtom[] };
  try {
    parsed = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'invalid json' }) };
  }
  const wrong = parsed.wrong ?? [];
  const right = parsed.right ?? [];
  if (!Array.isArray(wrong) || !Array.isArray(right)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'wrong/right must be arrays' }) };
  }
  if (wrong.length + right.length === 0) {
    return { statusCode: 400, body: JSON.stringify({ error: 'empty session' }) };
  }

  const openaiKey = process.env.OPENAI_TTS_KEY;
  const deepseekKey = process.env.VITE_OPENAI_API_KEY;

  // Prefer real OpenAI when configured; otherwise use DeepSeek (the project
  // already has a key in env).
  const provider = openaiKey
    ? { url: 'https://api.openai.com/v1/chat/completions', key: openaiKey, model: 'gpt-4o-mini' }
    : deepseekKey
      ? { url: 'https://api.deepseek.com/chat/completions', key: deepseekKey, model: 'deepseek-chat' }
      : null;

  if (!provider) {
    return { statusCode: 503, body: JSON.stringify({ error: 'no llm key configured' }) };
  }

  try {
    const response = await fetch(provider.url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${provider.key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: provider.model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt(wrong.slice(0, 20), right.slice(0, 20)) },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.4,
      }),
    });
    if (!response.ok) {
      const err = await response.text().catch(() => '');
      console.error('upstream', response.status, err.slice(0, 200));
      return { statusCode: 502, body: JSON.stringify({ error: 'upstream_failed' }) };
    }
    const data: any = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      return { statusCode: 502, body: JSON.stringify({ error: 'empty content' }) };
    }
    let parsedContent: any;
    try {
      parsedContent = JSON.parse(content);
    } catch {
      return { statusCode: 502, body: JSON.stringify({ error: 'bad json from llm' }) };
    }
    const bullets: unknown = parsedContent?.bullets;
    if (!Array.isArray(bullets) || bullets.length === 0) {
      return { statusCode: 502, body: JSON.stringify({ error: 'no bullets' }) };
    }
    const cleaned = bullets
      .filter((b): b is string => typeof b === 'string')
      .map((b) => b.trim().slice(0, 280))
      .filter((b) => b.length > 10)
      .slice(0, 5);
    if (cleaned.length === 0) {
      return { statusCode: 502, body: JSON.stringify({ error: 'all bullets invalid' }) };
    }
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      body: JSON.stringify({ bullets: cleaned }),
    };
  } catch (err) {
    console.error('takeaways function error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'function_failed' }) };
  }
};

export { handler };
