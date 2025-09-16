# ConceptNode Generator

This tool generates ConceptNodes from text input using DeepSeek AI. It's designed to help developers quickly create concept nodes for the UCAT-UKMLA application.

## Prerequisites

1. Node.js and npm installed
2. DeepSeek API key (set in `.env` file)

## Setup

1. Install dependencies:
   ```bash
   cd scripts
   npm install
   ```

2. Create a `.env` file in the project root with your DeepSeek API key:
   ```
   VITE_OPENAI_API_KEY=your-deepseek-api-key-here
   ```

## Usage

### From a Text File

```bash
npx ts-node generateConceptNodes.ts --file path/to/input.txt
```

Example:
```bash
npx ts-node generateConceptNodes.ts --file sample-input.txt
```

### From Command Line Text

```bash
npx ts-node generateConceptNodes.ts --text "Your text content here"
```

## Input Format

The input should be educational content that can be broken down into discrete concepts. For example:

```
Asthma
Asthma is a chronic inflammatory condition of the airways characterized by hyperresponsiveness, 
mucus hypersecretion, and airway remodeling. It presents with episodic wheezing, breathlessness, 
chest tightness, and coughing, particularly at night or early morning.

COPD
COPD is characterized by persistent airflow limitation that is usually progressive and associated 
with an enhanced chronic inflammatory response in the airways and lungs to noxious particles or gases.
```

## Output

The tool will:

1. Generate ConceptNodes from the input text
2. Validate them against the ConceptNode type
3. Deduplicate by concept_id
4. Append valid nodes to `public/conceptModel.json`
5. Create a detailed log file in the `logs` directory

## Logs

Logs are stored in the `logs` directory with timestamps. They contain detailed information about:
- Generated nodes
- Validation issues
- Added and skipped nodes

## Troubleshooting

- **API Key Issues**: Ensure your DeepSeek API key is correctly set in the `.env` file
- **Type Errors**: If you encounter TypeScript errors, ensure you're using the correct version of TypeScript and that all dependencies are installed
- **Validation Failures**: Check the logs for detailed information about why nodes failed validation
