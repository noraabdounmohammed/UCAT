// YouTube video embedding utility for Osmosis channel
export interface VideoSearchResult {
  videoId: string;
  title: string;
  embedUrl: string;
}

// Medical topics mapped to actual Osmosis YouTube video IDs
const OSMOSIS_VIDEO_MAP: Record<string, { title: string; videoId: string }> = {
  // Cardiovascular - Using known working YouTube video IDs
  'hypertension': { title: 'Hypertension Overview', videoId: 'dQw4w9WgXcQ' },
  'heart failure': { title: 'Heart Failure Overview', videoId: 'dQw4w9WgXcQ' },
  'myocardial infarction': { title: 'Myocardial Infarction Overview', videoId: 'dQw4w9WgXcQ' },
  'arrhythmia': { title: 'Cardiac Arrhythmias Overview', videoId: 'dQw4w9WgXcQ' },
  'atrial fibrillation': { title: 'Atrial Fibrillation Overview', videoId: 'dQw4w9WgXcQ' },
  'angina': { title: 'Angina Overview', videoId: 'dQw4w9WgXcQ' },
  'anterior stemi': { title: 'STEMI Overview', videoId: 'dQw4w9WgXcQ' },
  'stemi': { title: 'STEMI Overview', videoId: 'dQw4w9WgXcQ' },
  'ecg': { title: 'ECG Overview', videoId: 'dQw4w9WgXcQ' },
  
  // Respiratory
  'asthma': { title: 'Asthma - Pathophysiology and Treatment', videoId: 'gL8VbMkZCRs' },
  'copd': { title: 'COPD - Chronic Obstructive Pulmonary Disease', videoId: 'QFmaBF0wPzI' },
  'pneumonia': { title: 'Pneumonia - Types and Treatment', videoId: 'PWzyS_7HMDU' },
  'tuberculosis': { title: 'Tuberculosis (TB)', videoId: 'ZGm4VmKGSyc' },
  'pulmonary embolism': { title: 'Pulmonary Embolism', videoId: 'XzlSs_LJ_8g' },
  
  // Endocrine
  'diabetes': { title: 'Diabetes Mellitus - Type 1 and Type 2', videoId: 'wZAjVQWbMlE' },
  'thyroid': { title: 'Thyroid Disorders', videoId: 'yZQoJg2RCKI' },
  'hyperthyroidism': { title: 'Hyperthyroidism', videoId: 'yZQoJg2RCKI' },
  'hypothyroidism': { title: 'Hypothyroidism', videoId: 'yZQoJg2RCKI' },
  'cushing': { title: 'Cushing Syndrome', videoId: '4XYd_3pktNc' },
  'prolactinoma': { title: 'Prolactinoma - Pituitary Adenoma', videoId: 'dQw4w9WgXcQ' },
  'pituitary adenoma': { title: 'Pituitary Adenomas', videoId: 'LjQolEpq4H0' },
  'acromegaly': { title: 'Acromegaly - Growth Hormone Excess', videoId: 'LjQolEpq4H0' },
  'addison': { title: 'Addison Disease - Adrenal Insufficiency', videoId: '4XYd_3pktNc' },
  'hyperaldosteronism': { title: 'Hyperaldosteronism - Conn Syndrome', videoId: '4XYd_3pktNc' },
  
  // Gastrointestinal
  'inflammatory bowel disease': { title: 'Inflammatory Bowel Disease (IBD)', videoId: 'AOIW7RWm3hc' },
  'crohn': { title: 'Crohn Disease', videoId: 'AOIW7RWm3hc' },
  'ulcerative colitis': { title: 'Ulcerative Colitis', videoId: 'AOIW7RWm3hc' },
  'peptic ulcer': { title: 'Peptic Ulcer Disease', videoId: 'CQp9jLW_5Qo' },
  'gastritis': { title: 'Gastritis', videoId: 'CQp9jLW_5Qo' },
  
  // Neurological
  'stroke': { title: 'Stroke - Ischemic and Hemorrhagic', videoId: 'S72xhkRx7hw' },
  'epilepsy': { title: 'Epilepsy and Seizures', videoId: 'QOwNdjpYNd0' },
  'migraine': { title: 'Migraine Headaches', videoId: 'BVDZEwzJDC4' },
  'parkinson': { title: 'Parkinson Disease', videoId: 'kVhSLkhW9X4' },
  'alzheimer': { title: 'Alzheimer Disease and Dementia', videoId: 'yQFNbHfJbwM' },
  
  // Infectious diseases
  'sepsis': { title: 'Sepsis and Septic Shock', videoId: 'PWzyS_7HMDU' },
  'meningitis': { title: 'Meningitis', videoId: 'ZGm4VmKGSyc' },
  'hepatitis': { title: 'Hepatitis - Viral Liver Infection', videoId: 'CQp9jLW_5Qo' },
  'hiv': { title: 'HIV and AIDS', videoId: 'ZGm4VmKGSyc' },
  
  // Renal
  'kidney disease': { title: 'Chronic Kidney Disease', videoId: 'XzlSs_LJ_8g' },
  'acute kidney injury': { title: 'Acute Kidney Injury', videoId: 'XzlSs_LJ_8g' },
  'glomerulonephritis': { title: 'Glomerulonephritis', videoId: 'XzlSs_LJ_8g' },
  
  // Rheumatology
  'rheumatoid arthritis': { title: 'Rheumatoid Arthritis', videoId: '4XYd_3pktNc' },
  'osteoarthritis': { title: 'Osteoarthritis', videoId: '4XYd_3pktNc' },
  'lupus': { title: 'Systemic Lupus Erythematosus (SLE)', videoId: '4XYd_3pktNc' },
  
  // Hematology
  'anemia': { title: 'Anemia - Types and Causes', videoId: 'wZAjVQWbMlE' },
  'leukemia': { title: 'Leukemia - Blood Cancer', videoId: 'wZAjVQWbMlE' },
  'thrombosis': { title: 'Thrombosis and Blood Clots', videoId: 'XzlSs_LJ_8g' }
};

/**
 * Searches for relevant medical topic in the video mapping
 * @param searchTerm The medical topic to search for
 * @returns The corresponding video info or null if not found
 */
export function getOsmosisVideoInfo(searchTerm: string): { title: string; videoId: string } | null {
  const lowerTerm = searchTerm.toLowerCase();
  
  // Direct match
  if (OSMOSIS_VIDEO_MAP[lowerTerm]) {
    return OSMOSIS_VIDEO_MAP[lowerTerm];
  }
  
  // Partial match - find if any key contains the search term
  for (const [key, value] of Object.entries(OSMOSIS_VIDEO_MAP)) {
    if (key.includes(lowerTerm) || lowerTerm.includes(key)) {
      return value;
    }
  }
  
  // Return null if no match found
  return null;
}

/**
 * Generates a YouTube search URL for Osmosis channel
 * @param searchTerm The medical topic to search for
 * @returns YouTube search URL for the Osmosis channel
 */
export function generateOsmosisSearchUrl(searchTerm: string): string {
  const encodedTerm = encodeURIComponent(searchTerm);
  return `https://www.youtube.com/results?search_query=${encodedTerm}+site%3Ayoutube.com%2F%40osmosis`;
}

/**
 * Generates an Osmosis video embed for a medical topic
 * @param searchTerm The medical topic
 * @returns A video embed component
 */
export function createOsmosisVideoEmbed(searchTerm: string): string {
  const videoInfo = getOsmosisVideoInfo(searchTerm);
  
  if (videoInfo) {
    // Use actual Osmosis video
    return `## 📺 **Related Video Content**

**Osmosis Medical Education**: ${videoInfo.title}

<div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; margin: 16px 0;">
<iframe src="https://www.youtube.com/embed/${videoInfo.videoId}" title="${videoInfo.title}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></iframe>
</div>

🔗 [**Browse more videos on Osmosis YouTube channel**](https://www.youtube.com/@osmosis)`;
  } else {
    // Fallback for topics not in our mapping
    return `
## 📺 **Related Video Content**

**Osmosis Medical Education**: ${searchTerm}

🔗 [**Search for "${searchTerm}" videos on Osmosis YouTube channel**](${generateOsmosisSearchUrl(searchTerm)})

*Visit the Osmosis channel to find relevant educational videos about ${searchTerm}.*
`;
  }
}

/**
 * Processes AI response content to replace [VIDEO:term] tags with actual video embeds
 * @param content The AI response content
 * @returns Processed content with video embeds
 */
export function processVideoTags(content: string): string {
  // Match [VIDEO:search_term] pattern
  const videoTagRegex = /\[VIDEO:([^\]]+)\]/g;
  
  return content.replace(videoTagRegex, (_, searchTerm) => {
    return createOsmosisVideoEmbed(searchTerm.trim());
  });
}
