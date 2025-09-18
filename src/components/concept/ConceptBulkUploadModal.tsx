import React, { useState } from 'react';
import { useConceptStore } from '@/store/conceptStore';
import { ConceptNode } from '@/types/conceptTypes';
import { Button } from '@/components/ui/button';
import { 
  Loader2, 
  Plus, 
  Check, 
  AlertCircle, 
  X
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ConceptBulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ConceptBulkUploadModal: React.FC<ConceptBulkUploadModalProps> = ({
  isOpen,
  onClose
}) => {
  const [inputText, setInputText] = useState('');
  const [inputMode, setInputMode] = useState<'text' | 'url'>('text');
  const [activeTab, setActiveTab] = useState<'input' | 'results'>('input');
  const [generatedConcepts, setGeneratedConcepts] = useState<ConceptNode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [showCustomPrompt, setShowCustomPrompt] = useState(false);
  const [results, setResults] = useState<{
    added: Partial<ConceptNode>[];
    skipped: Partial<ConceptNode>[];
    failed: Partial<ConceptNode>[];
  }>({
    added: [],
    skipped: [],
    failed: []
  });

  // Function to call DeepSeek API and generate concepts
  const generateConcepts = async () => {
    if (!inputText.trim()) {
      setError('Please enter some text to generate concepts from.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
      
      if (!apiKey) {
        throw new Error('DeepSeek API key not configured. Please set VITE_OPENAI_API_KEY in your .env file.');
      }

      // System prompt for generating concept nodes
      const defaultPrompt = `You are a curriculum architect following MECE principles and cognitive chunking best practices. Given the input text, generate ConceptNode JSON objects that are:

MECE COMPLIANCE:
- Mutually Exclusive: Each concept covers ONE distinct idea with no overlap
- Collectively Exhaustive: Together, concepts cover the complete subject area
- No redundancy between concepts, no gaps in coverage

COGNITIVE CHUNKING:
- Each concept contains ONE discrete bit of information
- Single learning objective per concept
- Can be mastered in one focused study session
- Builds meaningful connections to related concepts

TECHNICAL REQUIREMENTS:
- Use exact TypeScript interface from conceptTypes.ts
- Assign slug-style concept_id (e.g., "cv_acs_stemi_dx")
- Title: short and exam-relevant
- Description: 1–2 sentences max
- Dimensions: Fill domain, subject, topic, subtopic
- Key facts: Focus on one essential piece of information per concept
- Decision rule: Add if clinically relevant
- mastery_data: Fill with default values

Output only a valid JSON array of ConceptNodes. No extra text.`;

      const systemPrompt = customPrompt.trim() || defaultPrompt;

      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: inputText
            }
          ],
          temperature: 0.3,
          max_tokens: 2000
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = await response.json();
      let content = data.choices[0].message.content;
      
      // Extract JSON from markdown code blocks if needed
      if (content.includes('```json')) {
        content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (content.includes('```')) {
        content = content.replace(/```\n?/g, '');
      }
      
      // Parse the JSON response
      let parsedNodes: Partial<ConceptNode>[] = [];
      try {
        parsedNodes = JSON.parse(content.trim());
        
        // Ensure the response is an array
        if (!Array.isArray(parsedNodes)) {
          parsedNodes = [parsedNodes];
        }
        
        // Fix and standardize the mastery_data structure and ensure concept_id
        parsedNodes = parsedNodes.map((node, index) => ({
          ...node,
          concept_id: node.concept_id || `concept-${Date.now()}-${index}`,
          mastery_data: {
            attempts: 0,
            correct: 0,
            incorrect: 0,
            mastery_level: 0,
            last_practiced: null
          },
          custom_filters: node.custom_filters || node.tags || []
        }));
        
        setGeneratedConcepts(parsedNodes);
        setActiveTab('preview');
      } catch (parseError) {
        console.error('Failed to parse API response as JSON:', content);
        throw new Error('Failed to parse API response');
      }
    } catch (error: unknown) {
      console.error('Error generating concepts:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // List of CORS proxy services with timeout and retry logic
  const corsProxies = [
    { url: 'https://api.allorigins.win/get?url=', type: 'allorigins', timeout: 10000 },
    { url: 'https://corsproxy.io/?', type: 'direct', timeout: 8000 },
    { url: 'https://cors-anywhere.herokuapp.com/', type: 'direct', timeout: 8000 },
    { url: 'https://thingproxy.freeboard.io/fetch/', type: 'direct', timeout: 8000 },
    { url: 'https://proxy.cors.sh/', type: 'direct', timeout: 8000 },
    { url: 'https://crossorigin.me/', type: 'direct', timeout: 8000 }
  ];

  // Helper function to fetch with timeout
  const fetchWithTimeout = async (url: string, timeout: number): Promise<Response> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  };

  // Helper function to extract plain text from HTML
  const extractTextFromHtml = (html: string): string => {
    // Create a temporary DOM element to parse HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // Remove script and style elements
    const scripts = tempDiv.querySelectorAll('script, style, noscript');
    scripts.forEach(el => el.remove());
    
    // Get text content and clean it up
    let text = tempDiv.textContent || tempDiv.innerText || '';
    
    // Clean up whitespace and formatting
    text = text
      .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
      .replace(/\n\s*\n/g, '\n') // Remove empty lines
      .trim();
    
    // If the text is very long (likely full HTML page), try to extract main content
    if (text.length > 5000) {
      // Look for common content indicators
      const contentSelectors = [
        'main', 'article', '.content', '#content', '.post', '.entry',
        '.article-body', '.post-content', '.entry-content', '[role="main"]'
      ];
      
      for (const selector of contentSelectors) {
        const contentEl = tempDiv.querySelector(selector);
        if (contentEl) {
          const contentText = contentEl.textContent || (contentEl as HTMLElement).innerText || '';
          if (contentText.length > 100) {
            return contentText.replace(/\s+/g, ' ').trim();
          }
        }
      }
      
      // If no main content found, try to get first few paragraphs
      const paragraphs = tempDiv.querySelectorAll('p');
      if (paragraphs.length > 0) {
        const firstParagraphs = Array.from(paragraphs)
          .slice(0, 5)
          .map(p => p.textContent || '')
          .filter(text => text.length > 20)
          .join('\n\n');
        
        if (firstParagraphs.length > 100) {
          return firstParagraphs;
        }
      }
    }
    
    return text;
  };

  // Fetch concepts from URL with CORS proxy fallback
  const fetchConceptsFromUrl = async (url: string): Promise<string> => {
    // First try direct fetch (works for CORS-enabled URLs)
    try {
      const response = await fetchWithTimeout(url, 5000);
      if (response.ok) {
        const html = await response.text();
        return extractTextFromHtml(html);
      }
    } catch (error) {
      console.log('Direct fetch failed, trying CORS proxies...');
    }

    // Try CORS proxies one by one with improved error handling
    const errors: string[] = [];
    
    for (const proxy of corsProxies) {
      try {
        let proxyUrl: string;
        let response: Response;

        if (proxy.type === 'allorigins') {
          // AllOrigins returns JSON with contents
          proxyUrl = `${proxy.url}${encodeURIComponent(url)}`;
          response = await fetchWithTimeout(proxyUrl, proxy.timeout);
          if (response.ok) {
            const data = await response.json();
            if (data.contents) {
              return extractTextFromHtml(data.contents);
            } else {
              throw new Error('No contents in AllOrigins response');
            }
          }
        } else {
          // Other proxies return content directly
          proxyUrl = `${proxy.url}${encodeURIComponent(url)}`;
          response = await fetchWithTimeout(proxyUrl, proxy.timeout);
          if (response.ok) {
            const html = await response.text();
            if (html.trim()) {
              return extractTextFromHtml(html);
            } else {
              throw new Error('Empty response from proxy');
            }
          }
        }
        
        errors.push(`${proxy.url}: HTTP ${response.status}`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`${proxy.url}: ${errorMsg}`);
        console.log(`Proxy ${proxy.url} failed:`, errorMsg);
        continue;
      }
    }

    // If all proxies fail, throw error with detailed information
    throw new Error(`Unable to fetch from ${url}. All methods failed:\n\nDirect fetch: CORS blocked\nProxy attempts:\n${errors.map(e => `• ${e}`).join('\n')}\n\nSuggestions:\n• Use GitHub raw files (raw.githubusercontent.com)\n• Use Google Drive public files with direct download links\n• Use Pastebin raw links\n• Or paste content directly into the text area`);
  };

  // Handle URL input processing
  const handleUrlFetch = async () => {
    if (!urlInput.trim()) {
      setError('Please enter a valid URL');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const content = await fetchConceptsFromUrl(urlInput);
      setInputText(content);
      setInputMode('text'); // Switch to text mode to show fetched content
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch from URL');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper functions for concept categorization
  const extractSubject = (title: string, custom_filters: string[]): string => {
    // Common medical subjects
    const subjects = {
      'Cardiovascular': ['heart', 'cardiac', 'cardiovascular', 'ecg', 'ekg', 'myocardial', 'angina', 'artery', 'vein', 'circulation', 'blood pressure', 'hypertension'],
      'Respiratory': ['lung', 'respiratory', 'breathing', 'airway', 'ventilation', 'asthma', 'copd', 'pneumonia', 'oxygen', 'pulmonary'],
      'Gastrointestinal': ['gi', 'gastro', 'intestinal', 'bowel', 'stomach', 'liver', 'hepatic', 'pancreas', 'gallbladder', 'digestion'],
      'Neurology': ['brain', 'neuro', 'nerve', 'spinal', 'cns', 'seizure', 'stroke', 'headache', 'cognitive'],
      'Endocrine': ['hormone', 'thyroid', 'diabetes', 'insulin', 'adrenal', 'pituitary', 'endocrine'],
      'Renal': ['kidney', 'renal', 'urinary', 'bladder', 'nephron', 'dialysis', 'urine'],
      'Hematology': ['blood', 'anemia', 'clotting', 'leukemia', 'lymphoma', 'transfusion', 'hematology'],
      'Infectious Disease': ['infection', 'bacteria', 'virus', 'fungal', 'antibiotic', 'sepsis', 'fever'],
      'Musculoskeletal': ['bone', 'joint', 'muscle', 'fracture', 'orthopedic', 'arthritis', 'tendon', 'ligament'],
      'Dermatology': ['skin', 'rash', 'dermatitis', 'eczema', 'psoriasis', 'melanoma']
    };
    
    const titleLower = title.toLowerCase();
    const filtersLower = custom_filters.map(f => f.toLowerCase());
    
    for (const [subject, keywords] of Object.entries(subjects)) {
      if (keywords.some(keyword => titleLower.includes(keyword.toLowerCase()) || 
                         filtersLower.some(filter => filter.includes(keyword.toLowerCase())))) {
        return subject;
      }
    }
    
    return 'General Medicine';
  };
  
  const determineBodySystems = (title: string, custom_filters: string[]): string[] => {
    const systemMap = {
      'Cardiovascular': ['heart', 'cardiac', 'cardiovascular', 'ecg', 'ekg', 'myocardial', 'angina', 'artery', 'vein'],
      'Respiratory': ['lung', 'respiratory', 'breathing', 'airway', 'ventilation', 'asthma', 'copd', 'pneumonia'],
      'Gastrointestinal': ['gi', 'gastro', 'intestinal', 'bowel', 'stomach', 'liver', 'hepatic', 'pancreas'],
      'Neurological': ['brain', 'neuro', 'nerve', 'spinal', 'cns', 'seizure', 'stroke', 'headache'],
      'Endocrine': ['hormone', 'thyroid', 'diabetes', 'insulin', 'adrenal', 'pituitary'],
      'Renal': ['kidney', 'renal', 'urinary', 'bladder', 'nephron', 'dialysis'],
      'Hematological': ['blood', 'anemia', 'clotting', 'leukemia', 'lymphoma', 'transfusion'],
      'Immune': ['immune', 'allergy', 'autoimmune', 'antibody', 'antigen', 'immunodeficiency'],
      'Musculoskeletal': ['bone', 'joint', 'muscle', 'fracture', 'orthopedic', 'arthritis'],
      'Integumentary': ['skin', 'rash', 'dermatitis', 'eczema', 'psoriasis', 'melanoma']
    };
    
    const titleLower = title.toLowerCase();
    const filtersLower = custom_filters.map(f => f.toLowerCase());
    const matchedSystems = [];
    
    for (const [system, keywords] of Object.entries(systemMap)) {
      if (keywords.some(keyword => titleLower.includes(keyword.toLowerCase()) || 
                         filtersLower.some(filter => filter.includes(keyword.toLowerCase())))) {
        matchedSystems.push(system);
      }
    }
    
    return matchedSystems.length > 0 ? matchedSystems : ['General'];
  };
  
  const determineCompetencies = (decisionRule: string): string[] => {
    const competencies = [];
    
    if (decisionRule.match(/diagnos(is|e|tic)|identif(y|ication)|assess(ment)|evaluat(e|ion)|recogni(ze|tion)/i)) {
      competencies.push('Diagnosis');
    }
    
    if (decisionRule.match(/treat(ment)|manag(e|ement)|therap(y|eutic)|intervention|care|plan|approach/i)) {
      competencies.push('Management');
    }
    
    if (decisionRule.match(/prevent(ion|ative)|prophyla(x|ctic)|reduc(e|tion) of risk|screen(ing)/i)) {
      competencies.push('Prevention');
    }
    
    if (decisionRule.match(/communicat(e|ion)|explain|discuss|counsel|educat(e|ion)|inform/i)) {
      competencies.push('Communication');
    }
    
    if (competencies.length === 0) {
      competencies.push('Knowledge');
    }
    
    return competencies;
  };

  // Function to save concepts to the store
  const saveConcepts = () => {
    const added: Partial<ConceptNode>[] = [];
    const skipped: Partial<ConceptNode>[] = [];
    const failed: Partial<ConceptNode>[] = [];

    // Get existing concepts from localStorage
    const storedConcepts = localStorage.getItem('user_concepts');
    const userConcepts = storedConcepts ? JSON.parse(storedConcepts) : [];
    
    // Track existing concept IDs to avoid duplicates
    const existingIds = new Set(userConcepts.map((c: any) => c.concept_id));

    generatedConcepts.forEach(concept => {
      try {
        if (!concept.concept_id || !concept.title || !concept.description) {
          failed.push(concept);
          return;
        }

        // Check if concept already exists
        if (existingIds.has(concept.concept_id)) {
          skipped.push(concept);
          return;
        }

        // Prepare the concept with required fields including concept_id
        const newConcept: Partial<ConceptNode> = {
          concept_id: concept.concept_id, // Ensure concept_id is preserved
          title: concept.title,
          content: concept.content || concept.description || '',
          custom_filters: concept.custom_filters || concept.tags || [],
          prerequisites: concept.prerequisites || [],
          mastery_data: {
            attempts: 0,
            correct: 0,
            incorrect: 0,
            mastery_level: 0,
            last_practiced: null
          }
        };

        // Add to user concepts
        userConcepts.push(newConcept);
        existingIds.add(concept.concept_id);
        added.push(concept);
      } catch (error) {
        console.error(`Error adding concept ${concept.concept_id}:`, error);
        failed.push(concept);
      }
    });

    // Save updated concepts to localStorage
    localStorage.setItem('user_concepts', JSON.stringify(userConcepts));
    
    // Reload concepts in the store
    if (added.length > 0) {
      useConceptStore.getState().loadConcepts();
    }

    setResults({ added, skipped, failed });
    setActiveTab('results');
  };

  const handleReset = () => {
    setInputText('');
    setGeneratedConcepts([]);
    setResults({ added: [], skipped: [], failed: [] });
    setActiveTab('input');
    setError(null);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" 
      style={{ backdropFilter: 'blur(4px)' }}
      onClick={handleClose}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Bulk Upload Concepts
          </h2>
          <button
            onClick={handleClose}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 80px)' }}>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
            <TabsList className="mb-4">
              <TabsTrigger value="input">Input Text</TabsTrigger>
              <TabsTrigger value="preview" disabled={generatedConcepts.length === 0}>
                Preview ({generatedConcepts.length})
              </TabsTrigger>
              <TabsTrigger value="results" disabled={results.added.length === 0 && results.failed.length === 0}>
                Results
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="input">
              <div>
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                  <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">How it works:</h3>
                  <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                    <li>• Paste any educational text (articles, notes, study materials)</li>
                    <li>• Or use the URL tab to fetch content from web pages</li>
                    <li>• AI will automatically extract and create concept cards</li>
                    <li>• No special formatting required - plain text works perfectly</li>
                    <li>• You can also paste JSON if you have structured data</li>
                  </ul>
                </div>

                
                {/* Input Mode Toggle */}
                <div className="mb-4">
                  <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                    <button
                      onClick={() => setInputMode('text')}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                        inputMode === 'text'
                          ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                      }`}
                    >
                      Plain Text
                    </button>
                    <button
                      onClick={() => setInputMode('url')}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                        inputMode === 'url'
                          ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                      }`}
                    >
                      URL
                    </button>
                  </div>
                </div>

                {inputMode === 'url' ? (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Enter URL to fetch concepts data
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="url"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholder="https://example.com/concepts.json"
                      />
                      <button
                        onClick={handleUrlFetch}
                        disabled={isLoading || !urlInput.trim()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isLoading ? 'Fetching...' : 'Fetch'}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Supports JSON files, raw text, or any URL. Uses CORS proxies for blocked sites.
                    </p>
                    <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                      <p className="font-medium mb-1">✅ Recommended URLs:</p>
                      <ul className="space-y-0.5 text-xs">
                        <li>• GitHub raw: <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">raw.githubusercontent.com/user/repo/main/file.json</code></li>
                        <li>• Pastebin raw: <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">pastebin.com/raw/[id]</code></li>
                        <li>• Google Drive: Make public → Get shareable link</li>
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Paste your educational content
                    </label>
                    <textarea
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      className="w-full h-64 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                      placeholder={`Paste any educational text here, for example:

Heart failure is a condition where the heart cannot pump blood effectively to meet the body's needs. It can be caused by coronary artery disease, high blood pressure, or previous heart attacks. Symptoms include shortness of breath, fatigue, and swelling in the legs.

Diabetes mellitus is a group of metabolic disorders characterized by high blood sugar levels. Type 1 diabetes is caused by autoimmune destruction of pancreatic beta cells, while Type 2 diabetes involves insulin resistance.

The AI will automatically extract concepts from your text and create individual concept cards.`}
                    />
                  </div>
                )}

                {/* Custom AI Prompt Section */}
                <div className="mb-4">
                  <button
                    type="button"
                    onClick={() => setShowCustomPrompt(!showCustomPrompt)}
                    className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                  >
                    <svg 
                      className={`h-4 w-4 mr-2 transition-transform ${showCustomPrompt ? 'rotate-90' : ''}`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    Customize AI Generation Prompt (Optional)
                  </button>
                  
                  {showCustomPrompt && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          Customize how concepts are extracted
                        </span>
                        <button
                          type="button"
                          onClick={() => setCustomPrompt('')}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          Reset to Default
                        </button>
                      </div>
                      
                      <textarea
                        value={customPrompt}
                        onChange={(e) => setCustomPrompt(e.target.value)}
                        className="w-full h-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm font-mono"
                        placeholder="Customize how the AI generates concepts from your text. Leave blank to use our default MECE + Cognitive Chunking approach.

Our Philosophy: Each concept = one distinct idea with no overlap (MECE), containing exactly one bit of information (Chunking)

Example customizations:
- Extract only definitions, ignore everything else
- Focus solely on step-by-step processes
- Include only diagnostic criteria and symptoms
- Extract just the key facts, exclude background theory
- Generate concepts only from numbered lists or bullet points"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        💡 Tip: Be specific about what you want. Example: "Focus on cardiology concepts with emphasis on diagnostic criteria and treatment protocols for UKMLA exam preparation."
                      </p>
                    </div>
                  )}
                </div>
                
                {error && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                <div className="flex justify-end gap-3">
                  <Button 
                    variant="outline"
                    onClick={handleClose}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={generateConcepts} 
                    disabled={isLoading || !inputText.trim()}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating Concepts...
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-4 w-4" />
                        Generate Concepts
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="preview">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Preview Generated Concepts</h3>
                  <Badge variant="outline">{generatedConcepts.length} concepts</Badge>
                </div>
                
                <div className="mb-6 max-h-[350px] overflow-y-auto border rounded-md">
                  {generatedConcepts.map((concept, index) => (
                    <div key={concept.concept_id || index} className="p-4 border-b last:border-b-0">
                      <div className="flex justify-between">
                        <h4 className="font-medium">{concept.title}</h4>
                        <span className="text-xs text-gray-500">{concept.concept_id}</span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{concept.content || concept.description}</p>
                      {concept.custom_filters && concept.custom_filters.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {concept.custom_filters.map(filter => (
                            <Badge key={filter} variant="secondary" className="text-xs">{filter}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                <div className="flex justify-between gap-3">
                  <Button variant="outline" onClick={() => setActiveTab('input')}>
                    Back to Input
                  </Button>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={handleClose}>
                      Cancel
                    </Button>
                    <Button onClick={saveConcepts} className="bg-blue-600 hover:bg-blue-700 text-white">
                      <Check className="mr-2 h-4 w-4" />
                      Save All Concepts
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="results">
              <div>
                <h3 className="text-lg font-semibold mb-4">Results</h3>
                
                {results.added.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-md font-medium flex items-center text-green-600 dark:text-green-400 mb-2">
                      <Check className="h-4 w-4 mr-2" />
                      Added Concepts ({results.added.length})
                    </h4>
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 max-h-[150px] overflow-y-auto">
                      <ul className="list-disc list-inside">
                        {results.added.map((concept, index) => (
                          <li key={index} className="text-sm">{concept.title}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
                
                {results.skipped.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-md font-medium flex items-center text-yellow-600 dark:text-yellow-400 mb-2">
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Skipped (Already Exists) ({results.skipped.length})
                    </h4>
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 max-h-[150px] overflow-y-auto">
                      <ul className="list-disc list-inside">
                        {results.skipped.map((concept, index) => (
                          <li key={index} className="text-sm">{concept.title}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
                
                {results.failed.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-md font-medium flex items-center text-red-600 dark:text-red-400 mb-2">
                      <X className="h-4 w-4 mr-2" />
                      Failed ({results.failed.length})
                    </h4>
                    <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 max-h-[150px] overflow-y-auto">
                      <ul className="list-disc list-inside">
                        {results.failed.map((concept, index) => (
                          <li key={index} className="text-sm">{concept.title || 'Unnamed concept'}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
                
                <div className="flex justify-end gap-3">
                  <Button 
                    variant="outline"
                    onClick={handleReset}
                  >
                    Upload More
                  </Button>
                  <Button 
                    onClick={handleClose}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default ConceptBulkUploadModal;
