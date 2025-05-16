/*
  # Add sample questions
  
  This migration adds initial sample questions for the QR section
  covering different topics and difficulty levels.
*/

-- Insert sample questions if they don't exist
INSERT INTO questions (
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
      'Percentages',
      'percent-change',
      'medium',
      'If a shirt originally priced at £80 is discounted by 25%, then increased by 20%, what is the final price?',
      ARRAY['£72', '£76', '£80', '£84'],
      '1',
      'First calculate 25% off: £80 × 0.75 = £60. Then increase by 20%: £60 × 1.2 = £72'
    ),
    (
      'Ratios',
      'simplify-ratio',
      'easy',
      'Simplify the ratio 24:36:48 to its lowest terms.',
      ARRAY['2:3:4', '3:4:5', '4:6:8', '6:9:12'],
      '0',
      'Divide all numbers by their GCD (12): 24÷12 : 36÷12 : 48÷12 = 2:3:4'
    ),
    (
      'Data Interpretation',
      'read-tables',
      'hard',
      'A hospital recorded patient wait times over 4 hours. If 120 patients were seen and 15% waited over 4 hours, how many patients were seen within the target time?',
      ARRAY['85', '102', '105', '98'],
      '1',
      '15% waited over 4 hours, so 85% were seen within target. 120 × 0.85 = 102 patients'
    )
) AS v(main_topic, micro_skill, difficulty, individual_question, options, correct_answer, worked_solution)
WHERE NOT EXISTS (
  SELECT 1 FROM questions
  LIMIT 1
);