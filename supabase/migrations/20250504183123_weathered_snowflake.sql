/*
  # Insert sample questions

  1. New Data
    - Add initial set of QR practice questions
    - Include questions for different topics and difficulty levels
    - Each question includes options, correct answer, and worked solution

  2. Structure
    - Questions are categorized by section (QR)
    - Each question has a main topic and micro skill
    - Difficulty levels follow the check constraint (Easy, Medium, Hard)
*/

-- Insert sample questions if they don't exist
INSERT INTO questions (
  section,
  main_topic,
  micro_skill,
  difficulty,
  individual_question,
  options,
  correct_answer,
  worked_solution
)
SELECT * FROM (
  VALUES
    (
      'QR',
      'Percentages',
      'percent-change',
      'Medium',
      'A store increases its prices by 20% and then offers a 25% discount. What is the overall percentage change?',
      ARRAY['-10%', '-5%', '0%', '+5%'],
      '0',
      'First increase: ×1.2, Then decrease: ×0.75, Combined: 1.2 × 0.75 = 0.9, Therefore -10% change'
    ),
    (
      'QR',
      'Percentages',
      'percent-value',
      'Easy',
      'What is 15% of 80?',
      ARRAY['8', '12', '15', '20'],
      '1',
      '15% = 15/100, 15/100 × 80 = 12'
    ),
    (
      'QR',
      'Ratios',
      'ratio-word',
      'Medium',
      'In a class of 30 students, the ratio of boys to girls is 2:3. How many boys are there?',
      ARRAY['10', '12', '15', '18'],
      '1',
      'Total parts = 2 + 3 = 5, Each part = 30 ÷ 5 = 6, Boys = 2 × 6 = 12'
    ),
    (
      'QR',
      'Data Interpretation',
      'read-tables',
      'Hard',
      'A study tracked patient recovery times. If 40% recovered within 2 days, and 75% within 4 days, what percentage recovered between 2 and 4 days?',
      ARRAY['25%', '35%', '40%', '45%'],
      '1',
      'After 2 days: 40%, After 4 days: 75%, Difference = 75% - 40% = 35%'
    ),
    (
      'QR',
      'Averages & Statistics',
      'mean-calc',
      'Medium',
      'The mean of five numbers is 12. If four of the numbers are 8, 13, 15, and 16, what is the fifth number?',
      ARRAY['6', '8', '10', '12'],
      '1',
      'Sum = Mean × Count, 12 × 5 = 60, Known sum = 8 + 13 + 15 + 16 = 52, Fifth number = 60 - 52 = 8'
    )
) AS v(section, main_topic, micro_skill, difficulty, individual_question, options, correct_answer, worked_solution)
WHERE NOT EXISTS (
  SELECT 1 FROM questions
  WHERE individual_question = v.individual_question
);