#!/usr/bin/env ts-node

import fs from 'fs';
import path from 'path';
import { Command } from 'commander';
import chalk from 'chalk';
import { ConceptNode, ConceptModel } from '../src/types/conceptTypes';
import { z } from 'zod';

// Load environment variables
import * as dotenv from 'dotenv';
dotenv.config();

// Define the path to the concept model JSON file
const CONCEPT_MODEL_PATH = path.join(process.cwd(), 'public', 'conceptModel.json');

// Set up command line interface
const program = new Command();
program
  .name('generateConceptNodes')
  .description('Generate concept nodes from text input using DeepSeek AI')
  .version('1.0.0')
  .option('-f, --file <path>', 'Path to input text file')
  .option('-t, --text <text>', 'Text input to process')
  .parse(process.argv);

const options = program.opts();

// Create a log file for detailed logging
function createLogFile(): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const logDir = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
  }
  const logFile = path.join(logDir, `concept-generation-${timestamp}.log`);
  return logFile;
}

// Write to log file
function writeToLog(logFile: string, message: string): void {
  fs.appendFileSync(logFile, `${message}\n`);
}

// Main function
async function main() {
  // Create log file
  const logFile = createLogFile();
  writeToLog(logFile, `Concept Node Generation - ${new Date().toISOString()}`);
  writeToLog(logFile, '='.repeat(50));

  // Validate input
  if (!options.file && !options.text) {
    const errorMsg = 'Error: Either --file or --text must be provided';
    console.error(chalk.red(errorMsg));
    writeToLog(logFile, errorMsg);
    program.help();
    process.exit(1);
  }

  // Get input text
  let inputText = '';
  let inputSource = '';
  if (options.file) {
    try {
      inputText = fs.readFileSync(options.file, 'utf8');
      inputSource = options.file;
      console.log(chalk.blue(`Read input from file: ${options.file}`));
      writeToLog(logFile, `Input source: ${options.file}`);
      writeToLog(logFile, `Input length: ${inputText.length} characters`);
    } catch (error) {
      const errorMsg = `Error reading file: ${error.message}`;
      console.error(chalk.red(errorMsg));
      writeToLog(logFile, errorMsg);
      process.exit(1);
    }
  } else {
    inputText = options.text;
    inputSource = 'command line';
    console.log(chalk.blue('Using provided text input'));
    writeToLog(logFile, 'Input source: command line text');
    writeToLog(logFile, `Input length: ${inputText.length} characters`);
  }

  // Generate concept nodes from input text
  console.log(chalk.yellow('Generating concept nodes from input...'));
  writeToLog(logFile, '\nGenerating concept nodes...');
  
  try {
    // Call DeepSeek API to generate nodes
    const startTime = Date.now();
    const generatedNodes = await generateConceptNodesFromText(inputText);
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log(chalk.green(`Successfully generated ${generatedNodes.length} concept nodes in ${duration}s`));
    writeToLog(logFile, `Generated ${generatedNodes.length} concept nodes in ${duration}s`);
    
    // Log generated node IDs
    writeToLog(logFile, '\nGenerated nodes:');
    generatedNodes.forEach(node => {
      writeToLog(logFile, `- ${node.concept_id}: ${node.title}`);
    });

    // Validate nodes
    console.log(chalk.yellow('Validating nodes...'));
    writeToLog(logFile, '\nValidating nodes...');
    const { validNodes, invalidNodes } = validateNodes(generatedNodes);
    console.log(chalk.green(`Validated ${validNodes.length} nodes`));
    writeToLog(logFile, `Valid nodes: ${validNodes.length}`);
    writeToLog(logFile, `Invalid nodes: ${invalidNodes.length}`);
    
    if (invalidNodes.length > 0) {
      console.log(chalk.yellow(`Found ${invalidNodes.length} invalid nodes`));
      writeToLog(logFile, '\nInvalid nodes:');
      invalidNodes.forEach(node => {
        const nodeId = node.concept_id || 'unknown';
        console.log(chalk.yellow(`  - Invalid node: ${nodeId}`));
        writeToLog(logFile, `- ${nodeId}: ${node.title || 'No title'}`);
      });
    }

    // Add nodes to concept model
    console.log(chalk.yellow('Adding nodes to concept model...'));
    writeToLog(logFile, '\nAdding nodes to concept model...');
    const { added, skipped } = await addNodesToConceptModel(validNodes);
    
    console.log(chalk.green(`Added ${added.length} nodes to concept model`));
    writeToLog(logFile, `Added nodes: ${added.length}`);
    writeToLog(logFile, `Skipped nodes: ${skipped.length}`);
    
    if (added.length > 0) {
      writeToLog(logFile, '\nAdded nodes:');
      added.forEach(node => {
        writeToLog(logFile, `- ${node.concept_id}: ${node.title}`);
      });
    }
    
    if (skipped.length > 0) {
      console.log(chalk.yellow(`Skipped ${skipped.length} duplicate nodes`));
      writeToLog(logFile, '\nSkipped nodes:');
      skipped.forEach(node => {
        console.log(chalk.yellow(`  - Skipped: ${node.concept_id}`));
        writeToLog(logFile, `- ${node.concept_id}: ${node.title}`);
      });
    }
    
    // Print summary
    console.log(chalk.blue('\nSummary:'));
    console.log(chalk.blue(`  Input source: ${inputSource}`));
    console.log(chalk.blue(`  Generated: ${generatedNodes.length} nodes`));
    console.log(chalk.blue(`  Valid: ${validNodes.length} nodes`));
    console.log(chalk.blue(`  Invalid: ${invalidNodes.length} nodes`));
    console.log(chalk.blue(`  Added: ${added.length} nodes`));
    console.log(chalk.blue(`  Skipped: ${skipped.length} nodes`));
    console.log(chalk.blue(`  Log file: ${logFile}`));
    
    writeToLog(logFile, '\nOperation completed successfully.');
  } catch (error) {
    const errorMsg = `Error: ${error.message}`;
    console.error(chalk.red(errorMsg));
    writeToLog(logFile, `\nERROR: ${error.message}`);
    if (error.stack) {
      writeToLog(logFile, error.stack);
    }
    writeToLog(logFile, '\nOperation failed.');
    process.exit(1);
  }
}

// Function to generate concept nodes from text using DeepSeek
async function generateConceptNodesFromText(text: string): Promise<Partial<ConceptNode>[]> {
  const apiKey = process.env.VITE_OPENAI_API_KEY;
  
  if (!apiKey || apiKey === 'your-deepseek-api-key-here') {
    throw new Error('DeepSeek API key not configured. Please set VITE_OPENAI_API_KEY in your .env file.');
  }

  // System prompt as specified in requirements
  const systemPrompt = `You are a curriculum architect. Given the input text, generate one ConceptNode JSON object per discrete concept. Use the exact TypeScript interface from conceptTypes.ts.

Assign a slug-style concept_id (e.g., "cv_acs_stemi_dx").

Title: short and exam-relevant.

Description: 1–2 sentences max.

Dimensions: Fill domain, subject, topic, subtopic.

Key facts: List essential facts.

Decision rule: Add if relevant.

mastery_data: Fill with default values.

Output only a valid JSON array of ConceptNodes. No extra text.`;

  console.log(chalk.blue('Sending request to DeepSeek API...'));
  
  try {
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
            content: text
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`DeepSeek API error: ${response.statusText}. ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    let content = data.choices[0].message.content;
    
    // DeepSeek often wraps JSON in markdown code blocks, so we need to extract it
    if (content.includes('```json')) {
      content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (content.includes('```')) {
      content = content.replace(/```\n?/g, '');
    }
    
    // Parse the JSON response
    let parsedNodes: Partial<ConceptNode>[];
    try {
      parsedNodes = JSON.parse(content.trim());
      
      // Ensure the response is an array
      if (!Array.isArray(parsedNodes)) {
        console.warn(chalk.yellow('API returned a single node instead of an array, converting to array'));
        parsedNodes = [parsedNodes];
      }
      
      return parsedNodes;
    } catch (parseError) {
      console.error(chalk.red('Failed to parse DeepSeek response as JSON:'));
      console.error(content);
      throw new Error(`Failed to parse DeepSeek response: ${parseError.message}`);
    }
  } catch (error) {
    console.error(chalk.red(`Error calling DeepSeek API: ${error.message}`));
    throw error;
  }
}

// Define Zod schema for ConceptNode validation
const BloomLevelSchema = z.enum(['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create']);
const QuestionFormatSchema = z.enum(['mcq', 'emq', 'data_interpretation', 'osce', 'short_answer', 'flashcard', 'essay', 'ukmla_sba']);
const RelationshipTypeSchema = z.enum(['prerequisite_of', 'part_of', 'contrasts_with', 'analogous_to', 'misconception_of']);

const BloomMasteryStatsSchema = z.object({
  attempts: z.number(),
  correct: z.number(),
});

const ConceptMasteryDataSchema = z.object({
  attempts: z.number(),
  correct: z.number(),
  incorrect: z.number(),
  mastery_level: z.number(),
  last_practiced: z.string().nullable(),
  bloom_stats: z.record(BloomLevelSchema, BloomMasteryStatsSchema).optional(),
  stability: z.number().optional(),
  next_review_at: z.string().optional(),
});

const UKMLADimensionsSchema = z.object({
  systems: z.array(z.string()),
  conditions: z.array(z.string()),
  presentations: z.array(z.string()),
  competencies: z.array(z.string()),
});

const GenericTaxonomySchema = z.object({
  domain: z.string(),
  subject: z.string(),
  topic: z.string().optional(),
  subtopic: z.string().optional(),
});

const ExamSpecificSchema = z.object({
  ukmla: UKMLADimensionsSchema.optional(),
});

const ConceptDimensionsSchema = GenericTaxonomySchema.extend({
  exam_specific: ExamSpecificSchema.optional(),
});

const ConceptKnowledgeSchema = z.object({
  decision_rule: z.string(),
  guideline_ref: z.object({
    name: z.string(),
    year: z.number(),
    key_line: z.string(),
  }).optional(),
  misconceptions: z.array(z.string()).optional(),
  key_facts: z.array(z.string()).optional(),
});

const ConceptRelationSchema = z.object({
  type: RelationshipTypeSchema,
  target_id: z.string(),
});

const TemplateSpecSchema = z.object({
  prompt: z.string(),
  hints: z.array(z.string()).optional(),
  answer_template: z.string().optional(),
});

const MediaAssetSchema = z.object({
  type: z.enum(['image', 'chart', 'audio', 'video', 'dataset', 'code']),
  uri: z.string(),
  caption: z.string().optional(),
});

const ReferenceSchema = z.object({
  label: z.string(),
  url: z.string().optional(),
  citation: z.string().optional(),
});

const AuthoringMetadataSchema = z.object({
  created_at: z.string(),
  updated_at: z.string(),
  version: z.string(),
  author: z.string().optional(),
});

const ConceptNodeSchema = z.object({
  concept_id: z.string(),
  title: z.string(),
  description: z.string(),
  tags: z.array(z.string()),
  bloom_levels: z.array(BloomLevelSchema).optional(),
  bloom_level: BloomLevelSchema.optional(),
  dimensions: ConceptDimensionsSchema.optional(),
  taxonomy: GenericTaxonomySchema.optional(),
  knowledge: ConceptKnowledgeSchema.optional(),
  relations: z.array(ConceptRelationSchema).optional(),
  relationships: z.array(ConceptRelationSchema).optional(),
  templates: z.record(BloomLevelSchema, z.record(QuestionFormatSchema, TemplateSpecSchema)).optional(),
  media: z.array(MediaAssetSchema).optional(),
  references: z.array(ReferenceSchema).optional(),
  authoring: AuthoringMetadataSchema.optional(),
  mastery_data: ConceptMasteryDataSchema,
  question_formats: z.array(QuestionFormatSchema).optional(),
  scope_note: z.string().optional(),
});

// Function to validate nodes against ConceptNode type
function validateNodes(nodes: Partial<ConceptNode>[]): { 
  validNodes: ConceptNode[], 
  invalidNodes: Partial<ConceptNode>[] 
} {
  const validNodes: ConceptNode[] = [];
  const invalidNodes: Partial<ConceptNode>[] = [];
  const validationIssues: Record<string, string[]> = {};

  for (const node of nodes) {
    try {
      // Add default mastery_data if not provided
      if (!node.mastery_data) {
        node.mastery_data = {
          attempts: 0,
          correct: 0,
          incorrect: 0,
          mastery_level: 0,
          last_practiced: null
        };
      }

      // Ensure tags is an array
      if (!node.tags) {
        node.tags = [];
      }
      
      // Fix templates type issue by using type assertion
      // This is safe because we're validating with Zod afterward
      const nodeToValidate = node as unknown as ConceptNode;

      // Validate against schema
      const validationResult = ConceptNodeSchema.safeParse(nodeToValidate);
      
      if (validationResult.success) {
        // Use type assertion to handle the TypeScript error
        // This is safe because we've validated with Zod
        validNodes.push(validationResult.data as unknown as ConceptNode);
      } else {
        const conceptId = node.concept_id || 'unknown';
        if (!validationIssues[conceptId]) {
          validationIssues[conceptId] = [];
        }
        validationIssues[conceptId].push(validationResult.error.message);
        invalidNodes.push(node);
      }
    } catch (error) {
      const conceptId = node.concept_id || 'unknown';
      if (!validationIssues[conceptId]) {
        validationIssues[conceptId] = [];
      }
      validationIssues[conceptId].push(error.message);
      invalidNodes.push(node);
    }
  }

  // Log validation issues in a structured way
  if (Object.keys(validationIssues).length > 0) {
    console.log(chalk.yellow('\nValidation issues:'));
    for (const [conceptId, issues] of Object.entries(validationIssues)) {
      console.log(chalk.yellow(`  - ${conceptId}:`));
      issues.forEach(issue => {
        console.log(chalk.yellow(`    - ${issue}`));
      });
    }
  }

  return { validNodes, invalidNodes };
}

// Function to add nodes to concept model with deduplication
async function addNodesToConceptModel(nodes: ConceptNode[]): Promise<{ 
  added: ConceptNode[], 
  skipped: ConceptNode[] 
}> {
  const added: ConceptNode[] = [];
  const skipped: ConceptNode[] = [];

  try {
    // Read the existing concept model
    console.log(chalk.blue(`Reading existing concept model from ${CONCEPT_MODEL_PATH}`));
    const conceptModelRaw = fs.readFileSync(CONCEPT_MODEL_PATH, 'utf8');
    const conceptModel: ConceptModel = JSON.parse(conceptModelRaw);

    // Create a map of existing concept IDs for quick lookup
    const existingConceptIds = new Set(conceptModel.concepts.map(c => c.concept_id));

    // Process each node
    for (const node of nodes) {
      if (existingConceptIds.has(node.concept_id)) {
        console.log(chalk.yellow(`Skipping duplicate concept: ${node.concept_id}`));
        skipped.push(node);
      } else {
        // Add the node to the concept model
        conceptModel.concepts.push(node);
        added.push(node);
        // Add the concept ID to the set to prevent duplicates within the new batch
        existingConceptIds.add(node.concept_id);
      }
    }

    // Write the updated concept model back to the file
    if (added.length > 0) {
      console.log(chalk.blue(`Writing updated concept model with ${added.length} new nodes`));
      fs.writeFileSync(CONCEPT_MODEL_PATH, JSON.stringify(conceptModel, null, 2), 'utf8');
    } else {
      console.log(chalk.yellow('No new nodes to add to concept model'));
    }

    return { added, skipped };
  } catch (error) {
    console.error(chalk.red(`Error adding nodes to concept model: ${error.message}`));
    throw error;
  }
}

// Run the main function
main().catch(error => {
  console.error(chalk.red(`Unhandled error: ${error.message}`));
  process.exit(1);
});
