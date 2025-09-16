// Script to update all concepts to include the UKMLA SBA format
const fs = require('fs');
const path = require('path');

// Read the concept model file
const conceptModelPath = path.join(__dirname, '../../../public/conceptModel.json');
const conceptModel = JSON.parse(fs.readFileSync(conceptModelPath, 'utf8'));

// Update each concept to include ukmla_sba format if it has sba format
conceptModel.concepts.forEach(concept => {
  if (concept.question_formats && concept.question_formats.includes('sba')) {
    if (!concept.question_formats.includes('ukmla_sba')) {
      concept.question_formats.push('ukmla_sba');
    }
  }
});

// Write the updated concept model back to the file
fs.writeFileSync(conceptModelPath, JSON.stringify(conceptModel, null, 2));

console.log('Successfully updated concept formats to include ukmla_sba');
