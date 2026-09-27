# Early-access feedback

The launch page has a prominent feedback banner and a persistent button in the session header. Completed sessions offer a reaction that opens a preselected form; the learner can send it without typing or signing in. Topics and a message are optional. Dismissed drafts remain in memory until the page reloads; microphone input stops on dismissal.

## Private inbox

Feedback is in the `public.pilot_feedback` table in the existing **Hippocampus** Supabase project (`uivitzexbtsmnspcitgh`). Use the project owner's Table Editor or SQL Editor. Guests and signed-in learners have column-limited INSERT access only. There is no public read, edit, or delete access; the client never requests returned rows. The server supplies the timestamp. No email, account ID, audio, or tutor conversation is collected.

Review the latest submissions:

```sql
select created_at, reaction, topics, message, used_voice,
       source, question_id, answered_count, case_count
from public.pilot_feedback
order by created_at desc
limit 100;
```

`question_id` helps trace a reported case. `source` distinguishes home, practice, and completed-session feedback. Treat reaction counts as directional pilot evidence: these are voluntary submissions, not one unique vote per student. Do not interpret missing feedback as satisfaction.

## Voice

The feedback form uses the browser's SpeechRecognition/webkitSpeechRecognition API where available. Dictation becomes editable text and is never submitted automatically. It stops after 60 seconds, stops on close/unmount, and handles denied permission, silence, and speech-service errors. Unsupported browsers show the keyboard-microphone fallback. Native dictation depends on the student's browser/device and its speech service. StudyEdit does not receive or store a feedback audio recording.

The existing Netlify transcription endpoint is not used for feedback: the production endpoint currently returns `audio_not_configured`. No transcription key or paid service was added for this pilot.

## Optional analytics

When PostHog is configured **and** the learner has opted in, explicit events record `pilot_session_started` (including resumed/returning flags), `pilot_tutor_used`, `pilot_session_completed`, `pilot_feedback_opened`, and `pilot_feedback_submitted`. Feedback message content is never included. Automatic capture and session recording are disabled. Feedback submission works independently of analytics consent.

Use a small first batch to check whether students can finish a session, what repeatedly gets in their way, and whether they return for another session. Review these signals alongside the comments before building requested features.
