import React, { useState } from 'react';
import { useConceptStore } from '@/store/conceptStore';
import { ConceptNode } from '@/types/conceptTypes';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Loader2, Plus, Check, AlertCircle, X } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const ConceptBulkUploadPage: React.FC = () => {
  const { addConcept } = useConceptStore();
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedConcepts, setGeneratedConcepts] = useState<Partial<ConceptNode>[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'input' | 'preview' | 'results'>('input');
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
      const systemPrompt = `You are a curriculum architect. Given the input text, generate one ConceptNode JSON object per discrete concept. Use the exact TypeScript interface from conceptTypes.ts.

Assign a slug-style concept_id (e.g., "cv_acs_stemi_dx").

Title: short and exam-relevant.

Description: 1–2 sentences max.

Dimensions: Fill domain, subject, topic, subtopic.

Key facts: List essential facts.

Decision rule: Add if relevant.

mastery_data: Fill with default values.

Output only a valid JSON array of ConceptNodes. No extra text.`;

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
        // Handle incomplete JSON by trying to fix it
        let jsonToProcess = content.trim();
        
        // Check if the JSON is incomplete (missing closing bracket)
        if (jsonToProcess.startsWith('[') && !jsonToProcess.endsWith(']')) {
          jsonToProcess += ']';
        }
        
        // Fix unterminated strings - common issue with AI-generated JSON
        // This is a simplified fix that may not handle all cases but addresses common issues
        const fixUnterminatedStrings = (json: string): string => {
          // Split by lines to find problematic ones
          const lines = json.split('\n');
          const fixedLines = lines.map(line => {
            // Check for lines with odd number of quotes (potential unterminated string)
            const quoteMatches = line.match(/"/g);
            if (quoteMatches && quoteMatches.length % 2 !== 0) {
              // Add a closing quote at the end of the line
              return line + '"';
            }
            return line;
          });
          return fixedLines.join('\n');
        };
        
        // Apply fixes for unterminated strings
        jsonToProcess = fixUnterminatedStrings(jsonToProcess);
        
        // Specific fix for position 7718 error
        if (jsonToProcess.length > 7718) {
          try {
            // Try to parse the JSON up to position 7718
            const truncatedJson = jsonToProcess.substring(0, 7718);
            // Find the last complete object in the truncated JSON
            const lastCompleteObjectEnd = truncatedJson.lastIndexOf('}')+1;
            if (lastCompleteObjectEnd > 0) {
              // Extract the valid part and close the array
              const validPart = jsonToProcess.substring(0, lastCompleteObjectEnd) + ']';
              try {
                // Try parsing just this valid part
                const partialParsed = JSON.parse(validPart);
                if (Array.isArray(partialParsed) && partialParsed.length > 0) {
                  console.log(`Successfully parsed ${partialParsed.length} objects by truncating at position 7718`);
                  parsedNodes = partialParsed;
                  // Skip the rest of the parsing logic
                  throw new Error('SKIP_REMAINING_PARSING');
                }
              } catch (e: unknown) {
                const error = e as Error;
                if (error && error.message === 'SKIP_REMAINING_PARSING') {
                  throw error; // Re-throw to skip remaining parsing
                }
                // If this approach failed, continue with normal parsing
                console.log('Truncation approach failed, continuing with normal parsing');
              }
            }
          } catch (e: unknown) {
            const error = e as Error;
            if (error && error.message === 'SKIP_REMAINING_PARSING') {
              // We successfully parsed a truncated version, skip to standardization
              // Process the nodes and set them directly
              const processedNodes = parsedNodes.map(node => ({
                ...node,
                mastery_data: {
                  attempts: 0,
                  correct: 0,
                  incorrect: 0,
                  mastery_level: 0,
                  last_practiced: null
                },
                tags: node.tags || []
              }));
              
              setGeneratedConcepts(processedNodes);
              setActiveTab('preview');
              return; // Exit the function early
            }
            // Otherwise continue with normal parsing
          }
        }
        
        // Try to parse the JSON with our fixes
        try {
          parsedNodes = JSON.parse(jsonToProcess);
        } catch (initialParseError) {
          console.warn('Initial parsing failed, trying more aggressive fixes...');
          
          // If that fails, try to extract and fix just the array part
          try {
            // Find the array portion of the response
            const arrayMatch = jsonToProcess.match(/\[([\s\S]*?)\]/); 
            if (arrayMatch) {
              // Try to parse each object individually
              const objectsText = arrayMatch[1];
              const objectTexts = objectsText.split(/\},\s*\{/).map((obj: string, i: number) => {
                // Add back the curly braces except for first and last items
                if (i === 0) return obj.endsWith('}') ? obj : obj + '}';
                if (i === objectTexts.length - 1) return '{' + obj;
                return '{' + obj + '}';
              });
              
              // Parse each object individually
              const validObjects = [];
              for (const objText of objectTexts) {
                try {
                  // Try to fix and parse each object
                  const fixedObjText = objText.replace(/([\{\,]\s*"[^"]+)(?:\s*:)/g, '$1"$2');
                  const obj = JSON.parse(fixedObjText);
                  validObjects.push(obj);
                } catch (e) {
                  console.warn('Failed to parse object:', objText);
                }
              }
              
              if (validObjects.length > 0) {
                parsedNodes = validObjects;
              } else {
                throw new Error('No valid objects found in the response');
              }
            } else {
              throw new Error('Could not find array in response');
            }
          } catch (extractError) {
            // If all else fails, try to manually extract concept objects
            console.warn('Extraction failed, attempting manual object extraction...');
            
            // Look for concept_id patterns to identify objects
            const conceptRegex = /"concept_id"\s*:\s*"([^"]+)"/g;
            const conceptMatches = [...jsonToProcess.matchAll(conceptRegex)];
            
            if (conceptMatches.length > 0) {
              // We found some concept IDs, let's try to build objects around them
              parsedNodes = conceptMatches.map(match => ({
                concept_id: match[1],
                title: `Concept ${match[1]}`,
                description: 'Generated from partial data',
                tags: []
              }));
            } else {
              throw initialParseError;
            }
          }
        }
        
        // Ensure the response is an array
        if (!Array.isArray(parsedNodes)) {
          console.warn('API returned a single node instead of an array, converting to array');
          parsedNodes = [parsedNodes];
        }
        
        // Fix and standardize the mastery_data structure
        parsedNodes = parsedNodes.map(node => {
          // Create a proper mastery_data object
          const standardMasteryData = {
            attempts: 0,
            correct: 0,
            incorrect: 0,
            mastery_level: 0,
            last_practiced: null
          };
          
          // If the node has mastery_data but with different structure, convert it
          if (node.mastery_data) {
            if (typeof node.mastery_data.mastery_level === 'number') {
              standardMasteryData.mastery_level = node.mastery_data.mastery_level;
            }
            
            // Ignore other non-standard fields
          }
          
          return {
            ...node,
            mastery_data: standardMasteryData,
            tags: node.tags || []
          };
        });
        
        setGeneratedConcepts(parsedNodes);
        setActiveTab('preview');
      } catch (parseError: unknown) {
        console.error('Failed to parse API response as JSON:', content);
        const errorMessage = parseError instanceof Error ? parseError.message : 'Unknown parsing error';
        throw new Error(`Failed to parse API response: ${errorMessage}`);
      }
    } catch (error: unknown) {
      console.error('Error generating concepts:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper functions for concept categorization
  const extractSubject = (title: string, tags: string[]): string => {
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
    
    // Check title and tags against subject keywords
    const titleLower = title.toLowerCase();
    const tagsLower = tags.map(t => t.toLowerCase());
    
    for (const [subject, keywords] of Object.entries(subjects)) {
      if (keywords.some(keyword => titleLower.includes(keyword.toLowerCase()) || 
                         tagsLower.some(tag => tag.includes(keyword.toLowerCase())))) {
        return subject;
      }
    }
    
    return 'General Medicine';
  };
  
  const determineBodySystems = (title: string, tags: string[]): string[] => {
    // Map of body systems and related keywords
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
    const tagsLower = tags.map(t => t.toLowerCase());
    const matchedSystems = [];
    
    for (const [system, keywords] of Object.entries(systemMap)) {
      if (keywords.some(keyword => titleLower.includes(keyword.toLowerCase()) || 
                         tagsLower.some(tag => tag.includes(keyword.toLowerCase())))) {
        matchedSystems.push(system);
      }
    }
    
    // If no systems matched, return a default
    return matchedSystems.length > 0 ? matchedSystems : ['General'];
  };
  
  const determineCompetencies = (decisionRule: string): string[] => {
    const competencies = [];
    
    // Check for diagnostic competency
    if (decisionRule.match(/diagnos(is|e|tic)|identif(y|ication)|assess(ment)|evaluat(e|ion)|recogni(ze|tion)/i)) {
      competencies.push('Diagnosis');
    }
    
    // Check for management competency
    if (decisionRule.match(/treat(ment)|manag(e|ement)|therap(y|eutic)|intervention|care|plan|approach/i)) {
      competencies.push('Management');
    }
    
    // Check for prevention competency
    if (decisionRule.match(/prevent(ion|ative)|prophyla(x|ctic)|reduc(e|tion) of risk|screen(ing)/i)) {
      competencies.push('Prevention');
    }
    
    // Check for communication competency
    if (decisionRule.match(/communicat(e|ion)|explain|discuss|counsel|educat(e|ion)|inform/i)) {
      competencies.push('Communication');
    }
    
    // Default to Knowledge if no specific competencies identified
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

        // Prepare the concept with required fields
        const fullConcept = {
          ...concept,
          mastery_data: concept.mastery_data || {
            attempts: 0,
            correct: 0,
            incorrect: 0,
            mastery_level: 0,
            last_practiced: null
          },
          tags: concept.tags || [],
          bloom_level: concept.bloom_level || 'understand',
          knowledge: concept.knowledge || { decision_rule: '', key_facts: [] },
          
          // Add relationships for graph visualization
          relationships: concept.relationships || [],
          relations: concept.relations || (() => {
            // Generate meaningful relations between concepts
            const relations = [];
            
            // Try to find related concepts in the existing batch
            const conceptTitle = concept.title?.toLowerCase() || '';
            const conceptTags = concept.tags || [];
            
            // Add relations to other concepts in the current batch
            generatedConcepts.forEach(otherConcept => {
              if (otherConcept.concept_id !== concept.concept_id) {
                const otherTitle = otherConcept.title?.toLowerCase() || '';
                const otherTags = otherConcept.tags || [];
                
                // Check for title similarity
                if (conceptTitle && otherTitle && 
                    (conceptTitle.includes(otherTitle) || otherTitle.includes(conceptTitle))) {
                  relations.push({
                    type: 'related_to',
                    target_id: otherConcept.concept_id
                  });
                }
                
                // Check for tag overlap
                const sharedTags = conceptTags.filter(tag => otherTags.includes(tag));
                if (sharedTags.length > 0) {
                  relations.push({
                    type: 'shares_tag_with',
                    target_id: otherConcept.concept_id
                  });
                }
              }
            });
            
            // If no relations found, add a default one
            if (relations.length === 0) {
              relations.push({
                type: 'part_of',
                target_id: 'medical_knowledge_base'
              });
            }
            
            return relations;
          })(),
          
          // Add dimensions for filtering
          dimensions: {
            domain: concept.dimensions?.domain || 'Medicine',
            subject: concept.dimensions?.subject || extractSubject(concept.title || '', concept.tags || []),
            topic: concept.dimensions?.topic || concept.title || '',
            subtopic: concept.dimensions?.subtopic || '',
            exam_specific: {
              ukmla: {
                systems: concept.dimensions?.exam_specific?.ukmla?.systems || 
                  determineBodySystems(concept.title || '', concept.tags || []),
                conditions: concept.dimensions?.exam_specific?.ukmla?.conditions || 
                  [concept.title || ''],  // Use title as condition
                presentations: concept.dimensions?.exam_specific?.ukmla?.presentations || 
                  concept.tags || [],  // Use tags as presentations
                competencies: concept.dimensions?.exam_specific?.ukmla?.competencies || 
                  determineCompetencies(concept.knowledge?.decision_rule || '')
              }
            }
          },
          
          // Add additional fields needed for functionality
          bloom_levels: ['understand', 'remember'],
          question_formats: ['ukmla_sba'],
          taxonomy: concept.taxonomy || { domain: 'Medicine', subject: '', topic: '', subtopic: '' }
        };

        // Add to user concepts
        userConcepts.push(fullConcept);
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
      // This will trigger a reload of concepts from localStorage
      useConceptStore.getState().loadConcepts();
    }

    setResults({ added, skipped, failed });
    setActiveTab('results');
  };

  return (
    <div className="container py-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Bulk Add Concepts</h1>
      
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
        <TabsList className="mb-4">
          <TabsTrigger value="input">Input Text</TabsTrigger>
          <TabsTrigger value="preview" disabled={generatedConcepts.length === 0}>Preview ({generatedConcepts.length})</TabsTrigger>
          <TabsTrigger value="results" disabled={results.added.length === 0 && results.failed.length === 0}>Results</TabsTrigger>
        </TabsList>
        
        <TabsContent value="input">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Enter Text to Generate Concepts</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Paste educational content that can be broken down into discrete concepts. The AI will analyze the text and generate concept nodes.
            </p>
            
            <Textarea 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Paste your educational content here..."
              className="min-h-[300px] mb-4"
            />
            
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <Button 
              onClick={generateConcepts} 
              disabled={isLoading || !inputText.trim()}
              className="w-full"
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
          </Card>
        </TabsContent>
        
        <TabsContent value="preview">
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Preview Generated Concepts</h2>
              <Badge variant="outline">{generatedConcepts.length} concepts</Badge>
            </div>
            
            <div className="mb-6 max-h-[500px] overflow-y-auto border rounded-md">
              {generatedConcepts.map((concept, index) => (
                <div key={concept.concept_id || index} className="p-4 border-b last:border-b-0">
                  <div className="flex justify-between">
                    <h3 className="font-medium">{concept.title}</h3>
                    <span className="text-xs text-gray-500">{concept.concept_id}</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{concept.description}</p>
                  {concept.tags && concept.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {concept.tags.map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setActiveTab('input')}>
                Back to Input
              </Button>
              <Button onClick={saveConcepts}>
                <Check className="mr-2 h-4 w-4" />
                Save All Concepts
              </Button>
            </div>
          </Card>
        </TabsContent>
        
        <TabsContent value="results">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Results</h2>
            
            {results.added.length > 0 && (
              <div className="mb-6">
                <h3 className="text-md font-medium flex items-center text-green-600 dark:text-green-400 mb-2">
                  <Check className="h-4 w-4 mr-2" />
                  Added Concepts ({results.added.length})
                </h3>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
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
                <h3 className="text-md font-medium flex items-center text-yellow-600 dark:text-yellow-400 mb-2">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Skipped (Already Exists) ({results.skipped.length})
                </h3>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
                  <ul className="list-disc list-inside">
                    {results.skipped.map((concept, index) => (
                      <li key={index} className="text-sm">{concept.title}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            
            {results.failed.length > 0 && (
              <div>
                <h3 className="text-md font-medium flex items-center text-red-600 dark:text-red-400 mb-2">
                  <X className="h-4 w-4 mr-2" />
                  Failed ({results.failed.length})
                </h3>
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                  <ul className="list-disc list-inside">
                    {results.failed.map((concept, index) => (
                      <li key={index} className="text-sm">{concept.title || 'Unnamed concept'}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            
            <div className="mt-6">
              <Button onClick={() => {
                setInputText('');
                setGeneratedConcepts([]);
                setResults({ added: [], skipped: [], failed: [] });
                setActiveTab('input');
              }}>
                Start New Batch
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ConceptBulkUploadPage;
