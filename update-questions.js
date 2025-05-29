// Script to generate the question database in the correct format
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name from the current file URL
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Raw question data from the provided array
const rawQuestions = [
  {
    "id": "d5b90fc1-d4c3-4c7c-9a20-430dbce4ebf8",
    "section": "QR",
    "set_id": "QR001",
    "set_name": "Set 1",
    "question_stem": "The table below provides data relevant to a real-world scenario involving percentages.",
    "individual_question": "Based on the data provided, what is the correct calculation or conclusion regarding the percentage increase?",
    "options": [
      "A. Option 0",
      "B. Option 1",
      "C. Option 2",
      "D. Option 3",
      "E. Option 4"
    ],
    "correct_answer": "C",
    "worked_solution": "Step-by-step breakdown of how to solve this percentages question using percentage increase. Includes explanation of relevant values and formula used.",
    "data_type": "table",
    "data_block": [
      {
        "label": "Item 1",
        "value": 10
      },
      {
        "label": "Item 2",
        "value": 20
      },
      {
        "label": "Item 3",
        "value": 30
      },
      {
        "label": "Item 4",
        "value": 40
      },
      {
        "label": "Item 5",
        "value": 50
      }
    ],
    "explanation_audio_url": null,
    "main_topic": "Percentages",
    "micro_skill": "Percentage Increase",
    "difficulty": "Easy",
    "created_at": "2025-05-14T16:27:05.115171"
  },
  {
    "id": "bee2591f-c312-45d4-95bc-c34c6dabfba6",
    "section": "QR",
    "set_id": "QR002",
    "set_name": "Set 2",
    "question_stem": "The table below provides data relevant to a real-world scenario involving percentages.",
    "individual_question": "Based on the data provided, what is the correct calculation or conclusion regarding the percentage of total?",
    "options": [
      "A. Option 1",
      "B. Option 2",
      "C. Option 3",
      "D. Option 4",
      "E. Option 5"
    ],
    "correct_answer": "C",
    "worked_solution": "Step-by-step breakdown of how to solve this percentages question using percentage of total. Includes explanation of relevant values and formula used.",
    "data_type": "table",
    "data_block": [
      {
        "label": "Item 1",
        "value": 11
      },
      {
        "label": "Item 2",
        "value": 21
      },
      {
        "label": "Item 3",
        "value": 31
      },
      {
        "label": "Item 4",
        "value": 41
      },
      {
        "label": "Item 5",
        "value": 51
      }
    ],
    "explanation_audio_url": null,
    "main_topic": "Percentages",
    "micro_skill": "Percentage of Total",
    "difficulty": "Medium",
    "created_at": "2025-05-14T16:27:05.115277"
  },
  {
    "id": "c0d8ce4b-7f32-4b8c-b43e-6b1d548af6bd",
    "section": "QR",
    "set_id": "QR003",
    "set_name": "Set 3",
    "question_stem": "The bar_chart below provides data relevant to a real-world scenario involving data interpretation.",
    "individual_question": "Based on the data provided, what is the correct calculation or conclusion regarding the average calculation?",
    "options": [
      "A. Option 2",
      "B. Option 3",
      "C. Option 4",
      "D. Option 5",
      "E. Option 6"
    ],
    "correct_answer": "C",
    "worked_solution": "Step-by-step breakdown of how to solve this data interpretation question using average calculation. Includes explanation of relevant values and formula used.",
    "data_type": "bar_chart",
    "data_block": [
      {
        "label": "Item 1",
        "value": 12
      },
      {
        "label": "Item 2",
        "value": 22
      },
      {
        "label": "Item 3",
        "value": 32
      },
      {
        "label": "Item 4",
        "value": 42
      },
      {
        "label": "Item 5",
        "value": 52
      }
    ],
    "explanation_audio_url": null,
    "main_topic": "Data Interpretation",
    "micro_skill": "Average Calculation",
    "difficulty": "Hard",
    "created_at": "2025-05-14T16:27:05.116080"
  },
  {
    "id": "953424a5-6908-461c-962c-d093afdccce2",
    "section": "QR",
    "set_id": "QR004",
    "set_name": "Set 4",
    "question_stem": "The bar_chart below provides data relevant to a real-world scenario involving data interpretation.",
    "individual_question": "Based on the data provided, what is the correct calculation or conclusion regarding the ranking from bar chart?",
    "options": [
      "A. Option 3",
      "B. Option 4",
      "C. Option 5",
      "D. Option 6",
      "E. Option 7"
    ],
    "correct_answer": "C",
    "worked_solution": "Step-by-step breakdown of how to solve this data interpretation question using ranking from bar chart. Includes explanation of relevant values and formula used.",
    "data_type": "bar_chart",
    "data_block": [
      {
        "label": "Item 1",
        "value": 13
      },
      {
        "label": "Item 2",
        "value": 23
      },
      {
        "label": "Item 3",
        "value": 33
      },
      {
        "label": "Item 4",
        "value": 43
      },
      {
        "label": "Item 5",
        "value": 53
      }
    ],
    "explanation_audio_url": null,
    "main_topic": "Data Interpretation",
    "micro_skill": "Ranking from Bar Chart",
    "difficulty": "Easy",
    "created_at": "2025-05-14T16:27:05.116542"
  },
  {
    "id": "6993185f-30e7-4c09-a315-8953b7872ca6",
    "section": "QR",
    "set_id": "QR005",
    "set_name": "Set 5",
    "question_stem": "The pie_chart below provides data relevant to a real-world scenario involving rates & speed.",
    "individual_question": "Based on the data provided, what is the correct calculation or conclusion regarding the efficiency (distance / fuel)?",
    "options": [
      "A. Option 4",
      "B. Option 5",
      "C. Option 6",
      "D. Option 7",
      "E. Option 8"
    ],
    "correct_answer": "C",
    "worked_solution": "Step-by-step breakdown of how to solve this rates & speed question using efficiency (distance / fuel). Includes explanation of relevant values and formula used.",
    "data_type": "pie_chart",
    "data_block": [
      {
        "label": "Item 1",
        "value": 14
      },
      {
        "label": "Item 2",
        "value": 24
      },
      {
        "label": "Item 3",
        "value": 34
      },
      {
        "label": "Item 4",
        "value": 44
      },
      {
        "label": "Item 5",
        "value": 54
      }
    ],
    "explanation_audio_url": null,
    "main_topic": "Rates & Speed",
    "micro_skill": "Efficiency (Distance / Fuel)",
    "difficulty": "Medium",
    "created_at": "2025-05-14T16:27:05.117441"
  },
  {
    "id": "e4823096-45ec-438a-a5aa-352c9e202236",
    "section": "QR",
    "set_id": "QR006",
    "set_name": "Set 6",
    "question_stem": "The table below provides data relevant to a real-world scenario involving ratios.",
    "individual_question": "Based on the data provided, what is the correct calculation or conclusion regarding the ratio simplification?",
    "options": [
      "A. Option 5",
      "B. Option 6",
      "C. Option 7",
      "D. Option 8",
      "E. Option 9"
    ],
    "correct_answer": "C",
    "worked_solution": "Step-by-step breakdown of how to solve this ratios question using ratio simplification. Includes explanation of relevant values and formula used.",
    "data_type": "table",
    "data_block": [
      {
        "label": "Item 1",
        "value": 15
      },
      {
        "label": "Item 2",
        "value": 25
      },
      {
        "label": "Item 3",
        "value": 35
      },
      {
        "label": "Item 4",
        "value": 45
      },
      {
        "label": "Item 5",
        "value": 55
      }
    ],
    "explanation_audio_url": null,
    "main_topic": "Ratios",
    "micro_skill": "Ratio Simplification",
    "difficulty": "Hard",
    "created_at": "2025-05-14T16:27:05.117822"
  },
  {
    "id": "cc785e01-d2ec-4eb8-9b51-286bfa62294e",
    "section": "QR",
    "set_id": "QR007",
    "set_name": "Set 7",
    "question_stem": "The line_chart below provides data relevant to a real-world scenario involving rates & speed.",
    "individual_question": "Based on the data provided, what is the correct calculation or conclusion regarding the speed = distance / time?",
    "options": [
      "A. Option 6",
      "B. Option 7",
      "C. Option 8",
      "D. Option 9",
      "E. Option 10"
    ],
    "correct_answer": "C",
    "worked_solution": "Step-by-step breakdown of how to solve this rates & speed question using speed = distance / time. Includes explanation of relevant values and formula used.",
    "data_type": "line_chart",
    "data_block": [
      {
        "label": "Item 1",
        "value": 16
      },
      {
        "label": "Item 2",
        "value": 26
      },
      {
        "label": "Item 3",
        "value": 36
      },
      {
        "label": "Item 4",
        "value": 46
      },
      {
        "label": "Item 5",
        "value": 56
      }
    ],
    "explanation_audio_url": null,
    "main_topic": "Rates & Speed",
    "micro_skill": "Speed = Distance / Time",
    "difficulty": "Easy",
    "created_at": "2025-05-14T16:27:05.118025"
  },
  {
    "id": "67b6134d-142f-4f71-bcd0-1d819dd4b53b",
    "section": "QR",
    "set_id": "QR008",
    "set_name": "Set 8",
    "question_stem": "The table below provides data relevant to a real-world scenario involving conversions.",
    "individual_question": "Based on the data provided, what is the correct calculation or conclusion regarding the unit conversion?",
    "options": [
      "A. Option 7",
      "B. Option 8",
      "C. Option 9",
      "D. Option 10",
      "E. Option 11"
    ],
    "correct_answer": "C",
    "worked_solution": "Step-by-step breakdown of how to solve this conversions question using unit conversion. Includes explanation of relevant values and formula used.",
    "data_type": "table",
    "data_block": [
      {
        "label": "Item 1",
        "value": 17
      },
      {
        "label": "Item 2",
        "value": 27
      },
      {
        "label": "Item 3",
        "value": 37
      },
      {
        "label": "Item 4",
        "value": 47
      },
      {
        "label": "Item 5",
        "value": 57
      }
    ],
    "explanation_audio_url": null,
    "main_topic": "Conversions",
    "micro_skill": "Unit Conversion",
    "difficulty": "Medium",
    "created_at": "2025-05-14T16:27:05.118252"
  },
  {
    "id": "7a20c46a-93a1-42d0-8e10-1fe116fd1df4",
    "section": "QR",
    "set_id": "QR009",
    "set_name": "Set 9",
    "question_stem": "The bar_chart below provides data relevant to a real-world scenario involving currency.",
    "individual_question": "Based on the data provided, what is the correct calculation or conclusion regarding the exchange rate?",
    "options": [
      "A. Option 8",
      "B. Option 9",
      "C. Option 10",
      "D. Option 11",
      "E. Option 12"
    ],
    "correct_answer": "C",
    "worked_solution": "Step-by-step breakdown of how to solve this currency question using exchange rate. Includes explanation of relevant values and formula used.",
    "data_type": "bar_chart",
    "data_block": [
      {
        "label": "Item 1",
        "value": 18
      },
      {
        "label": "Item 2",
        "value": 28
      },
      {
        "label": "Item 3",
        "value": 38
      },
      {
        "label": "Item 4",
        "value": 48
      },
      {
        "label": "Item 5",
        "value": 58
      }
    ],
    "explanation_audio_url": null,
    "main_topic": "Currency",
    "micro_skill": "Exchange Rate",
    "difficulty": "Hard",
    "created_at": "2025-05-14T16:27:05.118495"
  },
  {
    "id": "4ecc929a-00dc-4bd7-928c-bb9bb5224b11",
    "section": "QR",
    "set_id": "QR010",
    "set_name": "Set 10",
    "question_stem": "The table below provides data relevant to a real-world scenario involving geometry.",
    "individual_question": "Based on the data provided, what is the correct calculation or conclusion regarding the area & perimeter?",
    "options": [
      "A. Option 9",
      "B. Option 10",
      "C. Option 11",
      "D. Option 12",
      "E. Option 13"
    ],
    "correct_answer": "C",
    "worked_solution": "Step-by-step breakdown of how to solve this geometry question using area & perimeter. Includes explanation of relevant values and formula used.",
    "data_type": "table",
    "data_block": [
      {
        "label": "Item 1",
        "value": 19
      },
      {
        "label": "Item 2",
        "value": 29
      },
      {
        "label": "Item 3",
        "value": 39
      },
      {
        "label": "Item 4",
        "value": 49
      },
      {
        "label": "Item 5",
        "value": 59
      }
    ],
    "explanation_audio_url": null,
    "main_topic": "Geometry",
    "micro_skill": "Area & Perimeter",
    "difficulty": "Easy",
    "created_at": "2025-05-14T16:27:05.119010"
  }
];

// Convert the array to the expected format
const formattedDatabase = {
  questions: {}
};

// Process each question
rawQuestions.forEach(question => {
  // Map correct_answer (letter) to correctAnswer (index)
  let correctAnswerIndex = 2; // Default to C (index 2)
  if (question.correct_answer === 'A') correctAnswerIndex = 0;
  if (question.correct_answer === 'B') correctAnswerIndex = 1;
  if (question.correct_answer === 'C') correctAnswerIndex = 2;
  if (question.correct_answer === 'D') correctAnswerIndex = 3;
  if (question.correct_answer === 'E') correctAnswerIndex = 4;

  // Combine question_stem and individual_question
  const content = `${question.question_stem} ${question.individual_question}`;

  // Create the formatted question object
  formattedDatabase.questions[question.id] = {
    id: question.id,
    section: question.section,
    topic: question.main_topic,
    microSkill: question.micro_skill,
    difficulty: question.difficulty.toLowerCase(),
    content: content,
    options: question.options,
    correctAnswer: correctAnswerIndex,
    explanation: question.worked_solution,
    data_type: question.data_type,
    data_block: question.data_block,
    timeLimit: 60
  };
});

// Write the formatted database to both files
const srcPath = path.join(__dirname, 'src', 'data', 'questionDatabase.json');
const publicPath = path.join(__dirname, 'public', 'questionDatabase.json');

// Convert to JSON with pretty formatting
const jsonContent = JSON.stringify(formattedDatabase, null, 2);

// Write to both locations
fs.writeFileSync(srcPath, jsonContent);
fs.writeFileSync(publicPath, jsonContent);

console.log('Question database files updated successfully!');
