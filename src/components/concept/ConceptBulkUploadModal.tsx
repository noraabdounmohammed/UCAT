import React, { useState } from 'react';
import { useConceptStore } from '@/contexts/ConceptStoreContext';
import { ConceptNode, FilterCategory } from '@/types/conceptTypes';
import { Button } from '@/components/ui/button';
import { 
  Loader2, 
  Plus, 
  Check, 
  AlertCircle, 
  X,
  ArrowLeft
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ConceptBulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBack?: () => void;
}

export const ConceptBulkUploadModal: React.FC<ConceptBulkUploadModalProps> = ({
  isOpen,
  onClose,
  onBack
}) => {
  const [inputText, setInputText] = useState('');
  const [inputMode, setInputMode] = useState<'text' | 'url' | 'json'>('text');
  const [jsonInput, setJsonInput] = useState('');

  // Helper function to fill JSON template
  const fillJsonTemplate = () => {
    const template = `[
  {
    "title": "Heart Failure Pathophysiology",
    "content": "Heart failure occurs when the heart cannot pump blood effectively to meet the body's metabolic demands. This can result from systolic dysfunction (reduced ejection fraction) or diastolic dysfunction (impaired filling). Common causes include coronary artery disease, hypertension, and cardiomyopathy.",
    "custom_filters": ["cardiology", "shortness-of-breath", "heart-failure"],
    "filter_categories": [
      {
        "name": "System",
        "color": "#3B82F6",
        "filters": ["cardiology"]
      },
      {
        "name": "Presentation",
        "color": "#8B5CF6", 
        "filters": ["shortness-of-breath"]
      },
      {
        "name": "Condition",
        "color": "#EF4444",
        "filters": ["heart-failure"]
      }
    ]
  },
  {
    "title": "Diabetes Type 1 vs Type 2",
    "content": "Type 1 diabetes is an autoimmune condition where pancreatic beta cells are destroyed, leading to absolute insulin deficiency. Type 2 diabetes involves insulin resistance and relative insulin deficiency. Type 1 typically presents in childhood, while Type 2 is more common in adults with obesity.",
    "custom_filters": ["endocrinology", "polyuria", "diabetes"],
    "filter_categories": [
      {
        "name": "System",
        "color": "#3B82F6",
        "filters": ["endocrinology"]
      },
      {
        "name": "Presentation",
        "color": "#8B5CF6",
        "filters": ["polyuria"]
      },
      {
        "name": "Condition", 
        "color": "#EF4444",
        "filters": ["diabetes"]
      }
    ]
  }
]`;
    setJsonInput(template);
  };
  const [activeTab, setActiveTab] = useState<'input' | 'preview' | 'results'>('input');
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

  // Function to process JSON input with filter categories support
  const processJsonInput = async () => {
    if (!jsonInput.trim()) {
      setError('Please enter JSON data to import concepts.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const parsedData = JSON.parse(jsonInput);

      // Validate that it's an array
      if (!Array.isArray(parsedData)) {
        throw new Error('JSON must be an array of concept objects');
      }

      // Collect all filter categories from all concepts
      const allCategories = new Map<string, FilterCategory>();
      const filterAssignments: Record<string, string> = {};

      // Process categories from each concept
      parsedData.forEach((item: any) => {
        if (item.filter_categories && Array.isArray(item.filter_categories)) {
          item.filter_categories.forEach((category: any) => {
            if (category.name && category.filters && Array.isArray(category.filters)) {
              // Create or update category
              const categoryId = category.name.toLowerCase().replace(/\s+/g, '-');
              
              if (!allCategories.has(categoryId)) {
                allCategories.set(categoryId, {
                  id: categoryId,
                  name: category.name,
                  color: category.color || '#6B7280',
                  description: category.description || `Auto-imported category: ${category.name}`,
                  created_at: new Date()
                });
              }

              // Map filters to this category (normalize to lowercase-with-hyphens)
              category.filters.forEach((filter: string) => {
                const normalizedFilter = filter.toLowerCase().replace(/\s+/g, '-');
                filterAssignments[normalizedFilter] = categoryId;
              });
            }
          });
        }
      });

      // Convert to ConceptNode format
      const concepts: ConceptNode[] = parsedData.map((item: any, index: number) => {
        // Normalize custom_filters to lowercase-with-hyphens
        const normalizedFilters = (item.custom_filters || item.tags || []).map((filter: string) => 
          filter.toLowerCase().replace(/\s+/g, '-')
        );
        
        // Also add filters from filter_categories to custom_filters
        // This ensures all category filters are actually used
        const categoryFilters = new Set<string>(normalizedFilters);
        if (item.filter_categories && Array.isArray(item.filter_categories)) {
          item.filter_categories.forEach((category: any) => {
            if (category.filters && Array.isArray(category.filters)) {
              category.filters.forEach((filter: string) => {
                const normalizedFilter = filter.toLowerCase().replace(/\s+/g, '-');
                categoryFilters.add(normalizedFilter);
              });
            }
          });
        }
        
        return {
          concept_id: `json_import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${index}`,
          title: item.title || `Concept ${index + 1}`,
          content: item.content || item.description || '',
          custom_filters: Array.from(categoryFilters),
          prerequisites: [],
          mastery_data: {
            attempts: 0,
            correct: 0,
            incorrect: 0,
            mastery_level: 0,
            last_reviewed: null,
            last_practiced: null,
            next_review: null
          }
        };
      });

      console.log('🎯 Created concepts:', concepts);
      console.log('📂 Filter categories found:', Array.from(allCategories.values()));
      console.log('🔗 Filter assignments:', filterAssignments);

      // Store categories and assignments for later use during save
      (concepts as any)._importCategories = Array.from(allCategories.values());
      (concepts as any)._importAssignments = filterAssignments;

      setGeneratedConcepts(concepts);
      setActiveTab('preview');

    } catch (error) {
      console.error('JSON parsing error:', error);
      setError(`Invalid JSON format: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to call DeepSeek API and generate concepts
  const generateConcepts = async () => {
    if (inputMode === 'json') {
      return processJsonInput();
    }

    if (!inputText.trim() && inputMode === 'text') {
      setError('Please enter some text to generate concepts from.');
      return;
    }

    if (!urlInput.trim() && inputMode === 'url') {
      setError('Please enter a URL to fetch content from.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
      
      if (!apiKey) {
        throw new Error('DeepSeek API key not configured. Please set VITE_OPENAI_API_KEY in your .env file.');
      }

      // System prompt for generating concept nodes with filter categories
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

JSON FORMAT REQUIREMENTS:
Each concept should include:
- title: Short, exam-relevant title
- content: 1-2 sentences of essential information
- custom_filters: Array of relevant tags/filters
- filter_categories: Array of category objects that organize the filters

FILTER CATEGORIES STRUCTURE:
- Create logical groupings for your custom_filters
- Common categories: "System", "Condition", "Presentation", "Procedure", "Investigation"
- Each category should have: name, color (hex), filters (array of filter names)
- Use consistent category names across all concepts

EXAMPLE OUTPUT:
[
  {
    "title": "Heart Failure Pathophysiology",
    "content": "Heart failure occurs when the heart cannot pump blood effectively to meet metabolic demands.",
    "custom_filters": ["cardiology", "shortness-of-breath", "heart-failure"],
    "filter_categories": [
      {
        "name": "System",
        "color": "#3B82F6",
        "filters": ["cardiology"]
      },
      {
        "name": "Presentation",
        "color": "#8B5CF6",
        "filters": ["shortness-of-breath"]
      },
      {
        "name": "Condition",
        "color": "#EF4444",
        "filters": ["heart-failure"]
      }
    ]
  }
]

Output only a valid JSON array. No extra text.`;

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
          max_tokens: 8000
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
        // Check if content appears to be truncated
        let trimmedContent = content.trim();
        
        // Try to fix truncated JSON
        if (!trimmedContent.endsWith('}]') && !trimmedContent.endsWith('}')) {
          console.warn('API response appears to be truncated, attempting to fix...');
          
          // If it looks like an array but is missing the closing bracket
          if (trimmedContent.startsWith('[') && !trimmedContent.endsWith(']')) {
            // Find the last complete object and close the array
            const lastCompleteObject = trimmedContent.lastIndexOf('}');
            if (lastCompleteObject !== -1) {
              trimmedContent = trimmedContent.substring(0, lastCompleteObject + 1) + ']';
              console.log('Fixed truncated JSON array');
            }
          }
        }
        
        parsedNodes = JSON.parse(trimmedContent);
        
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
          custom_filters: node.custom_filters || (node as any).tags || []
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
    const scripts = tempDiv.querySelectorAll('script, style, noscript, nav, header, footer, .nav, .header, .footer, .sidebar, .menu');
    scripts.forEach(el => el.remove());
    
    // Enhanced content selectors for better extraction
    const contentSelectors = [
      // Y Combinator specific
      '.ycdc-with-sidebar-card-content', '.ycdc-card', '.startup-library-content',
      // Common content containers
      'main', 'article', '.content', '#content', '.post', '.entry',
      '.article-body', '.post-content', '.entry-content', '[role="main"]',
      '.markdown-body', '.prose', '.text-content', '.article-content',
      // Fallback to divs with substantial content
      'div[class*="content"]', 'div[id*="content"]', 'div[class*="article"]',
      'div[class*="post"]', 'div[class*="text"]'
    ];
    
    // Try to find the best content container
    let bestContent = '';
    let bestScore = 0;
    
    for (const selector of contentSelectors) {
      try {
        const elements = tempDiv.querySelectorAll(selector);
        elements.forEach(el => {
          // Remove navigation and other non-content elements from this container
          const navElements = el.querySelectorAll('nav, .nav, .navigation, .menu, .breadcrumb, .sidebar, .ads, .advertisement');
          navElements.forEach(nav => nav.remove());
          
          const contentText = el.textContent || (el as HTMLElement).innerText || '';
          const cleanText = contentText.replace(/\s+/g, ' ').trim();
          
          // Score content based on length and quality indicators
          let score = cleanText.length;
          
          // Bonus for paragraphs
          const paragraphCount = (el.querySelectorAll('p') || []).length;
          score += paragraphCount * 50;
          
          // Penalty for navigation-like content
          if (cleanText.toLowerCase().includes('navigation') || 
              cleanText.toLowerCase().includes('menu') ||
              cleanText.toLowerCase().includes('skip to')) {
            score *= 0.1;
          }
          
          // Bonus for educational content indicators
          if (cleanText.toLowerCase().includes('guide') ||
              cleanText.toLowerCase().includes('tutorial') ||
              cleanText.toLowerCase().includes('learn') ||
              cleanText.toLowerCase().includes('how to')) {
            score *= 1.5;
          }
          
          if (score > bestScore && cleanText.length > 100) {
            bestScore = score;
            bestContent = cleanText;
          }
        });
      } catch (e) {
        // Continue if selector fails
        continue;
      }
    }
    
    // If we found good content, use it
    if (bestContent && bestContent.length > 200) {
      console.log(`🎯 Extracted ${bestContent.length} characters using content selector`);
      return bestContent;
    }
    
    // Fallback: Get all text and try to clean it up
    let text = tempDiv.textContent || tempDiv.innerText || '';
    
    // Clean up whitespace and formatting
    text = text
      .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
      .replace(/\n\s*\n/g, '\n') // Remove empty lines
      .trim();
    
    // If text is very short, it might be a JavaScript-heavy site
    if (text.length < 200) {
      console.warn('⚠️ Very little text extracted. This might be a JavaScript-heavy site.');
      
      // Try to extract from any divs with text content
      const allDivs = tempDiv.querySelectorAll('div');
      const divTexts = Array.from(allDivs)
        .map(div => {
          const divText = div.textContent || '';
          return divText.trim();
        })
        .filter(text => text.length > 50 && text.length < 2000)
        .sort((a, b) => b.length - a.length);
      
      if (divTexts.length > 0) {
        text = divTexts.slice(0, 3).join('\n\n');
        console.log(`🔄 Fallback: Extracted ${text.length} characters from div elements`);
      }
    }
    
    // Final fallback: try to get meaningful paragraphs
    if (text.length < 200) {
      const paragraphs = tempDiv.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li');
      if (paragraphs.length > 0) {
        const paragraphTexts = Array.from(paragraphs)
          .map(p => p.textContent || '')
          .filter(text => text.length > 10)
          .join('\n\n');
        
        if (paragraphTexts.length > text.length) {
          text = paragraphTexts;
          console.log(`📝 Using paragraph extraction: ${text.length} characters`);
        }
      }
    }
    
    console.log(`📊 Final extracted text length: ${text.length} characters`);
    return text;
  };

  // Fetch concepts from URL with CORS proxy fallback
  const fetchConceptsFromUrl = async (url: string): Promise<string> => {
    console.log(`🌐 Attempting to fetch content from: ${url}`);
    
    // First try direct fetch (works for CORS-enabled URLs)
    try {
      console.log('🔄 Trying direct fetch...');
      const response = await fetchWithTimeout(url, 5000);
      if (response.ok) {
        const html = await response.text();
        console.log(`✅ Direct fetch successful, HTML length: ${html.length}`);
        const extractedText = extractTextFromHtml(html);
        if (extractedText.length > 100) {
          return extractedText;
        } else {
          console.warn('⚠️ Direct fetch returned very little content, trying proxies...');
        }
      }
    } catch (error) {
      console.log('❌ Direct fetch failed, trying CORS proxies...', error);
    }

    // Try CORS proxies one by one with improved error handling
    const errors: string[] = [];
    
    for (const proxy of corsProxies) {
      try {
        console.log(`🔄 Trying proxy: ${proxy.url}`);
        let proxyUrl: string;
        let response: Response;

        if (proxy.type === 'allorigins') {
          // AllOrigins returns JSON with contents
          proxyUrl = `${proxy.url}${encodeURIComponent(url)}`;
          response = await fetchWithTimeout(proxyUrl, proxy.timeout);
          if (response.ok) {
            const data = await response.json();
            console.log(`📦 AllOrigins response:`, { hasContents: !!data.contents, contentsLength: data.contents?.length });
            if (data.contents) {
              const extractedText = extractTextFromHtml(data.contents);
              if (extractedText.length > 100) {
                console.log(`✅ Successfully extracted ${extractedText.length} characters via AllOrigins`);
                return extractedText;
              } else {
                throw new Error(`AllOrigins returned very little content: ${extractedText.length} characters`);
              }
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
            console.log(`📄 Proxy response length: ${html.length}`);
            if (html.trim()) {
              const extractedText = extractTextFromHtml(html);
              if (extractedText.length > 100) {
                console.log(`✅ Successfully extracted ${extractedText.length} characters via ${proxy.url}`);
                return extractedText;
              } else {
                throw new Error(`Proxy returned very little content: ${extractedText.length} characters`);
              }
            } else {
              throw new Error('Empty response from proxy');
            }
          }
        }
        
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      } catch (error) {
        const errorMsg = `${proxy.url}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        console.log(`❌ Proxy ${proxy.url} failed:`, error);
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

  // Get store functions and curriculum ID at component level
  const { addConcept, createFilterCategory, curriculumId } = useConceptStore();

  // Function to save concepts to the store with filter categories
  const saveConcepts = () => {
    console.log('💾 Starting to save concepts:', generatedConcepts);
    console.log('🔑 Curriculum ID from useConceptStore:', curriculumId);
    console.log('🔍 Type of curriculum ID:', typeof curriculumId);
    
    const added: ConceptNode[] = [];
    const skipped: ConceptNode[] = [];
    const failed: ConceptNode[] = [];

    // First, handle filter categories if they exist
    const importCategories = (generatedConcepts as any)._importCategories;
    const importAssignments = (generatedConcepts as any)._importAssignments;

    if (importCategories && Array.isArray(importCategories)) {
      console.log('📂 Creating filter categories:', importCategories);
      console.log('📋 Using curriculum ID from store:', curriculumId);
      
      // Get existing categories to avoid duplicates
      const categoriesKey = `${curriculumId}_filter_categories`;
      const existingCategories = JSON.parse(localStorage.getItem(categoriesKey) || '[]');
      const existingCategoryNames = new Set(existingCategories.map((cat: any) => cat.name));
      
      importCategories.forEach((category: FilterCategory, index: number) => {
        try {
          // Only create if category doesn't already exist
          if (!existingCategoryNames.has(category.name)) {
            const { id, created_at, ...categoryData } = category;
            // Create immediately (IDs are now slug-based in store; no collision risk)
            createFilterCategory(categoryData);
            console.log('✅ Added new category:', category.name);
          } else {
            console.log('⚠️ Category already exists, skipping:', category.name);
          }
        } catch (error) {
          console.error('❌ Error adding category:', category.name, error);
        }
      });
    }

    // Automatically assign filters to their categories
    if (importAssignments && Object.keys(importAssignments).length > 0) {
      console.log('🔗 Automatically assigning filters to categories:', importAssignments);
      console.log('📋 Using curriculum ID from store:', curriculumId);
      
      // Store filter assignments in the correct format
      const assignmentKey = `${curriculumId}_filter_assignments`;
      const existingAssignments = JSON.parse(localStorage.getItem(assignmentKey) || '{}');

      // Ensure ALL filters from importCategories are included in assignments
      try {
        const ensured: Record<string, string> = { ...importAssignments };
        const importCats = (generatedConcepts as any)._importCategories as FilterCategory[] | undefined;
        if (importCats && Array.isArray(importCats)) {
          importCats.forEach(cat => {
            const catId = cat.id; // Use the actual category ID, not a slug
            const categoryFilters = (cat as any).filters || [];
            categoryFilters.forEach((f: string) => {
              // Always assign filters from categories, even if already assigned
              ensured[f] = catId;
            });
          });
        }
        // Also ensure all custom_filters on generated concepts are assigned if present in original mapping
        (generatedConcepts || []).forEach((c: any) => {
          (c.custom_filters || []).forEach((f: string) => {
            if (!ensured[f] && importAssignments[f]) {
              ensured[f] = importAssignments[f];
            }
          });
        });
        
        console.log('🔍 Ensured assignments:', ensured);
        
        // Replace importAssignments with ensured values
        Object.keys(ensured).forEach(key => {
          importAssignments[key] = ensured[key];
        });
      } catch (e) {
        console.warn('Assignment ensure step failed (non-fatal):', e);
      }
      
      // Merge with existing assignments (don't overwrite)
      const mergedAssignments = { ...existingAssignments, ...importAssignments };
      
      localStorage.setItem(assignmentKey, JSON.stringify(mergedAssignments));
      console.log('✅ Filter assignments saved to key:', assignmentKey);
      console.log('✅ Filter assignments content:', mergedAssignments);
    }

    // Then save concepts
    generatedConcepts.forEach(concept => {
      try {
        console.log('🔍 Processing concept:', concept);
        
        // Validate required fields (content, not description for JSON concepts)
        if (!concept.concept_id || !concept.title || !concept.content) {
          console.error('❌ Missing required fields:', { 
            concept_id: concept.concept_id, 
            title: concept.title, 
            content: concept.content 
          });
          failed.push(concept);
          return;
        }

        // Add concept using the store
        addConcept(concept);
        added.push(concept);
        console.log('✅ Successfully added concept:', concept.title);
        
      } catch (error) {
        console.error(`❌ Error adding concept ${concept.concept_id}:`, error);
        failed.push(concept);
      }
    });

    console.log(`📊 Save results: ${added.length} added, ${skipped.length} skipped, ${failed.length} failed`);
    
    // Update results and switch to results tab
    setResults({ 
      added: added as Partial<ConceptNode>[], 
      skipped: skipped as Partial<ConceptNode>[], 
      failed: failed as Partial<ConceptNode>[] 
    });
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
      className="fixed inset-0 bg-black/10 flex items-center justify-center z-50 p-4" 
      style={{ backdropFilter: 'blur(12px)' }}
      onClick={handleClose}
    >
      {/* Subtle texture overlay */}
      <div className="absolute inset-0 opacity-[0.015] pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\"100\" height=\"100\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cfilter id=\"noise\"%3E%3CfeTurbulence type=\"fractalNoise\" baseFrequency=\"0.9\" numOctaves=\"4\" /%3E%3C/filter%3E%3Crect width=\"100\" height=\"100\" filter=\"url(%23noise)\" /%3E%3C/svg%3E")' }}></div>
      
      <div 
        className="relative bg-[#FAFAF9]/95 backdrop-blur-2xl border-0 shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
        style={{ borderRadius: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-12 py-10 border-b border-black/[0.04] relative">
          <button
            onClick={handleClose}
            className="absolute top-6 right-6 w-9 h-9 flex items-center justify-center rounded-full hover:bg-stone-100 transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4 text-stone-400" />
          </button>
          
          <div className="h-[1px] w-16 bg-stone-300 mb-6"></div>
          
          <h2 className="text-3xl font-medium text-stone-900 mb-3 tracking-tight" style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}>
            Generate with AI
          </h2>
          <p className="text-sm text-stone-600 font-light" style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 300 }}>
            Auto-generate concepts from text, URLs, or documents
          </p>
        </div>

        {/* Content */}
        <div className="px-12 py-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
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
                <div className="bg-white/60 backdrop-blur-xl border border-black/[0.06] rounded-none p-6 mb-6">
                  <h3 className="text-sm font-medium text-stone-900 mb-3 uppercase tracking-widest" style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}>How it works:</h3>
                  <ul className="text-sm text-stone-600 space-y-2 font-light" style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 300 }}>
                    <li>• Paste any educational text (articles, notes, study materials)</li>
                    <li>• Or use the URL tab to fetch content from web pages</li>
                    <li>• AI will automatically extract and create concept cards with organized tags</li>
                    <li>• No special formatting required - plain text works perfectly</li>
                    <li>• You can also paste JSON with <strong>filter_categories</strong> for organized tag hierarchies</li>
                    <li>• Filter categories automatically create organized tag groups in your curriculum</li>
                  </ul>
                </div>

                
                {/* Input Mode Toggle */}
                <div className="mb-6">
                  <div className="flex gap-1 bg-white/60 backdrop-blur-xl p-1 rounded-full border border-black/[0.06]">
                    <button
                      onClick={() => setInputMode('text')}
                      className={`flex-1 px-4 py-2 text-[11px] uppercase tracking-widest font-medium rounded-full transition-all duration-300 ${
                        inputMode === 'text'
                          ? 'bg-stone-900 text-white'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                      style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}
                    >
                      Plain Text
                    </button>
                    <button
                      onClick={() => setInputMode('url')}
                      className={`flex-1 px-4 py-2 text-[11px] uppercase tracking-widest font-medium rounded-full transition-all duration-300 ${
                        inputMode === 'url'
                          ? 'bg-stone-900 text-white'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                      style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}
                    >
                      From URL
                    </button>
                    <button
                      onClick={() => setInputMode('json')}
                      className={`flex-1 px-4 py-2 text-[11px] uppercase tracking-widest font-medium rounded-full transition-all duration-300 ${
                        inputMode === 'json'
                          ? 'bg-stone-900 text-white'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                      style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}
                    >
                      From JSON
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
                        className="px-6 py-3 bg-stone-900 text-white rounded-full hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-[11px] uppercase tracking-widest"
                        style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}
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
                ) : inputMode === 'json' ? (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Paste JSON array of concepts
                    </label>
                    <div className="mb-3 p-4 bg-white/60 backdrop-blur-xl border border-black/[0.06] rounded-none">
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-[11px] uppercase tracking-widest font-medium text-stone-900" style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}>📋 JSON Template:</p>
                        <button
                          onClick={fillJsonTemplate}
                          className="text-[10px] px-3 py-1.5 bg-stone-900 text-white rounded-full hover:bg-stone-800 transition-all uppercase tracking-wider"
                          style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}
                        >
                          Fill Template
                        </button>
                      </div>
                      <pre className="text-xs text-stone-700 overflow-x-auto font-light" style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 300 }}>
{`[
  {
    "title": "Heart Failure Pathophysiology",
    "content": "Heart failure occurs when the heart cannot pump blood effectively to meet the body's metabolic demands. This can result from systolic dysfunction (reduced ejection fraction) or diastolic dysfunction (impaired filling). Common causes include coronary artery disease, hypertension, and cardiomyopathy.",
    "custom_filters": ["cardiovascular", "shortness-of-breath", "heart-failure"],
    "filter_categories": [
      {
        "name": "System",
        "color": "#3B82F6",
        "filters": ["cardiovascular"]
      },
      {
        "name": "Presentation",
        "color": "#8B5CF6",
        "filters": ["shortness-of-breath", "fatigue", "oedema"]
      },
      {
        "name": "Condition",
        "color": "#EF4444",
        "filters": ["heart-failure"]
      }
    ]
  },
  {
    "title": "ACE Inhibitors: Mechanism and Use",
    "content": "ACE inhibitors block angiotensin-converting enzyme, reducing angiotensin II production. This causes vasodilation and decreased aldosterone secretion. First-line for hypertension in younger patients and essential in heart failure management.",
    "custom_filters": ["cardiovascular", "hypertension", "pharmacology"],
    "filter_categories": [
      {
        "name": "System",
        "color": "#3B82F6",
        "filters": ["cardiovascular"]
      },
      {
        "name": "Presentation",
        "color": "#8B5CF6",
        "filters": ["raised-blood-pressure"]
      },
      {
        "name": "Condition",
        "color": "#EF4444",
        "filters": ["hypertension", "heart-failure"]
      },
      {
        "name": "Clinical",
        "color": "#10B981",
        "filters": ["pharmacology"]
      }
    ]
  }
]`}
                      </pre>
                    </div>
                    <textarea
                      value={jsonInput}
                      onChange={(e) => setJsonInput(e.target.value)}
                      className="w-full h-64 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm font-mono"
                      placeholder="Paste your JSON array here..."
                    />
                    <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                      <p className="font-medium mb-1">📝 Important notes:</p>
                      <ul className="space-y-0.5 text-xs">
                        <li>• <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">title</code> and <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">content</code> are required</li>
                        <li>• All filters are normalized to lowercase-with-hyphens (e.g., "Cardiovascular" → "cardiovascular")</li>
                        <li>• Filters in <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">filter_categories</code> are automatically added to the concept</li>
                        <li>• Every filter in <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">custom_filters</code> should appear in at least one category to avoid unassigned filters</li>
                        <li>• Categories are shared across all concepts in your curriculum</li>
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

                {/* Custom AI Prompt Section - Only show for text/url modes */}
                {inputMode !== 'json' && (
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
                          className="text-xs text-stone-600 hover:text-stone-900 underline transition-colors font-light"
                          style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 300 }}
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
                )}
                
                {error && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                <div className="flex justify-between">
                  <div>
                    {onBack && (
                      <button
                        type="button"
                        onClick={onBack}
                        className="px-6 py-3 text-stone-600 bg-white/60 backdrop-blur-xl border border-black/[0.06] hover:border-black/[0.12] rounded-full transition-all flex items-center text-[11px] uppercase tracking-widest"
                        style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}
                      >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Options
                      </button>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="px-6 py-3 text-stone-600 bg-white/60 backdrop-blur-xl border border-black/[0.06] hover:border-black/[0.12] rounded-full transition-all text-[11px] uppercase tracking-widest"
                      style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={generateConcepts} 
                      disabled={isLoading || (inputMode === 'text' && !inputText.trim()) || (inputMode === 'url' && !urlInput.trim()) || (inputMode === 'json' && !jsonInput.trim())}
                      className="px-6 py-3 bg-stone-900 hover:bg-stone-800 text-white rounded-full transition-all flex items-center text-[11px] uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}
                    >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {inputMode === 'json' ? 'Processing JSON...' : 'Generating Concepts...'}
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-4 w-4" />
                        {inputMode === 'json' ? 'Import Concepts' : 'Generate Concepts'}
                      </>
                    )}
                    </button>
                  </div>
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
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{concept.content || (concept as any).description}</p>
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

                <div className="flex justify-between">
                  <div>
                    {onBack && (
                      <button
                        type="button"
                        onClick={onBack}
                        className="px-6 py-3 text-stone-600 bg-white/60 backdrop-blur-xl border border-black/[0.06] hover:border-black/[0.12] rounded-full transition-all flex items-center text-[11px] uppercase tracking-widest"
                        style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}
                      >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Options
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setActiveTab('input')}
                      className="px-6 py-3 text-stone-600 bg-white/60 backdrop-blur-xl border border-black/[0.06] hover:border-black/[0.12] rounded-full transition-all text-[11px] uppercase tracking-widest"
                      style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}
                    >
                      Back to Input
                    </button>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="px-6 py-3 text-stone-600 bg-white/60 backdrop-blur-xl border border-black/[0.06] hover:border-black/[0.12] rounded-full transition-all text-[11px] uppercase tracking-widest"
                      style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={saveConcepts}
                      className="px-6 py-3 bg-stone-900 hover:bg-stone-800 text-white rounded-full transition-all flex items-center text-[11px] uppercase tracking-widest"
                      style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Save All Concepts
                    </button>
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
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-6 py-3 text-stone-600 bg-white/60 backdrop-blur-xl border border-black/[0.06] hover:border-black/[0.12] rounded-full transition-all text-[11px] uppercase tracking-widest"
                    style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}
                  >
                    Upload More
                  </button>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-6 py-3 bg-stone-900 hover:bg-stone-800 text-white rounded-full transition-all text-[11px] uppercase tracking-widest"
                    style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}
                  >
                    Close
                  </button>
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
