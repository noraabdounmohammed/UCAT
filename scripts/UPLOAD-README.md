# Upload Curriculum to Expert (Supabase Direct)

This script uploads a curriculum JSON file directly to Supabase, bypassing the slow browser publish flow.

## Quick Start

### 1. Install dependencies (first time only)
```bash
cd scripts
npm install
```

### 2. Set your Supabase credentials

**Option A: Use environment variables** (recommended)
```bash
# Windows PowerShell
$env:VITE_SUPABASE_URL="https://your-project.supabase.co"
$env:VITE_SUPABASE_ANON_KEY="your-anon-key"
```

**Option B: Edit the script directly**
Open `upload-curriculum-to-expert.js` and replace:
```javascript
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';
```

### 3. Export your curriculum to JSON

In the app:
1. Go to your curriculum
2. Click "Publish" → "Export to File"
3. Save the JSON file (e.g., `my-curriculum.json`)

### 4. Run the upload script

```bash
npm run upload path/to/curriculum.json "Your Name" "Country"
```

**Example:**
```bash
npm run upload ../my-curriculum.json "Dr. Nora" "UK"
```

**Or with full path:**
```bash
node upload-curriculum-to-expert.js C:\Users\Nora\Downloads\curriculum.json "Dr. Nora" "International"
```

## What it does

1. ✅ Reads your curriculum JSON file
2. ✅ Inserts curriculum metadata into `published_curriculums` table
3. ✅ Uploads all concepts in batches of 200 (fast and reliable)
4. ✅ Shows progress for each batch
5. ✅ Curriculum appears in Expert tab immediately

## Expected output

```
📖 Reading curriculum JSON...
📦 Uploading curriculum: UKMLA Biology
   Concepts: 579
   Author: Dr. Nora
   Country: UK

1️⃣ Inserting curriculum metadata...
✅ Metadata inserted

2️⃣ Uploading 579 concepts in 3 batches...
   Batch 1/3 (200 concepts)...
   ✅ Batch 1/3 uploaded
   Batch 2/3 (200 concepts)...
   ✅ Batch 2/3 uploaded
   Batch 3/3 (179 concepts)...
   ✅ Batch 3/3 uploaded

🎉 Curriculum uploaded successfully!
   Published ID: pub-curriculum-123-1234567890
   View at: https://studyedit.com (Expert tab)
```

## Troubleshooting

### "File not found"
- Check the file path is correct
- Use full path if relative path doesn't work

### "Failed to insert metadata"
- Check Supabase credentials are correct
- Ensure RLS policies allow inserts (should be enabled from earlier setup)

### "Failed to insert batch"
- Network issue or Supabase timeout
- Script will auto-cleanup (delete metadata) and you can retry

## Speed

- **579 concepts**: ~3-5 seconds total
- **1000+ concepts**: ~8-10 seconds total
- Much faster than browser publish!

## Notes

- The script uses the same batch size (200) and logic as the optimized browser publish
- It's more reliable because it runs directly from Node.js (no browser/PWA issues)
- You can run this as many times as needed
- Each run creates a new published curriculum (with unique ID)
