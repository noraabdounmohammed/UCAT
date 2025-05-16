/*
  # Add sample QR questions
  
  1. Changes
    - Insert 6 sample QR questions with various data types and topics
    - Include question stems, options, correct answers, and worked solutions
    - Add data blocks for tables, charts, and graphs
*/

INSERT INTO questions (
  id,
  section,
  set_id,
  set_name,
  question_stem,
  individual_question,
  options,
  correct_answer,
  worked_solution,
  data_type,
  data_block,
  main_topic,
  micro_skill,
  difficulty,
  created_at
) VALUES
  (
    gen_random_uuid(),
    'QR',
    'QR001',
    'Bike Store Sales',
    'The table below shows monthly sales for different bicycle types.',
    'What was the percentage increase in mountain bike sales from January to March?',
    ARRAY['A. 20%', 'B. 25%', 'C. 30%', 'D. 35%', 'E. 40%'],
    'C',
    'From 100 to 130 → (30/100)*100 = 30%',
    'table',
    '[
      {"type": "Mountain", "January": 100, "February": 110, "March": 130},
      {"type": "Road", "January": 80, "February": 90, "March": 95}
    ]'::jsonb,
    'Percentages',
    'Percentage Increase',
    'Medium',
    now()
  ),
  (
    gen_random_uuid(),
    'QR',
    'QR002',
    'Fruit Export Averages',
    'The table below shows fruit export volumes (in tonnes) for four years.',
    'Which fruit had the highest average export over four years?',
    ARRAY['A. Apples', 'B. Bananas', 'C. Oranges', 'D. Grapes', 'E. Pears'],
    'B',
    'Bananas: (120+130+135+140)/4 = 131.25',
    'table',
    '[
      {"fruit": "Apples", "2019": 100, "2020": 110, "2021": 105, "2022": 115},
      {"fruit": "Bananas", "2019": 120, "2020": 130, "2021": 135, "2022": 140}
    ]'::jsonb,
    'Data Interpretation',
    'Average Calculation',
    'Medium',
    now()
  ),
  (
    gen_random_uuid(),
    'QR',
    'QR003',
    'Ticket Sales',
    'The bar chart shows ticket sales for 5 events.',
    'Which event sold the second most tickets?',
    ARRAY['A. Event A', 'B. Event B', 'C. Event C', 'D. Event D', 'E. Event E'],
    'D',
    'Event E is highest. Event D is next highest at 4700.',
    'bar_chart',
    '[
      {"event": "Event A", "tickets": 3000},
      {"event": "Event B", "tickets": 4000},
      {"event": "Event C", "tickets": 4500},
      {"event": "Event D", "tickets": 4700},
      {"event": "Event E", "tickets": 5000}
    ]'::jsonb,
    'Data Interpretation',
    'Ranking from Bar Chart',
    'Easy',
    now()
  ),
  (
    gen_random_uuid(),
    'QR',
    'QR004',
    'Department Distribution',
    'The pie chart shows how 240 employees are distributed across departments.',
    'How many employees work in the Marketing department?',
    ARRAY['A. 36', 'B. 42', 'C. 48', 'D. 54', 'E. 60'],
    'C',
    '20% of 240 = 48',
    'pie_chart',
    '[
      {"department": "Tech", "percentage": 25},
      {"department": "HR", "percentage": 15},
      {"department": "Marketing", "percentage": 20},
      {"department": "Sales", "percentage": 30},
      {"department": "Support", "percentage": 10}
    ]'::jsonb,
    'Percentages',
    'Percentage of Total',
    'Easy',
    now()
  ),
  (
    gen_random_uuid(),
    'QR',
    'QR005',
    'Fuel Consumption',
    'The table shows fuel usage (litres) and distance (km) for different vehicles.',
    'Which vehicle had the highest fuel efficiency (km/l)?',
    ARRAY['A. Car A', 'B. Car B', 'C. Car C', 'D. Car D', 'E. Car E'],
    'B',
    'Car B: 450 km / 25 L = 18 km/l → highest',
    'table',
    '[
      {"vehicle": "Car A", "distance_km": 400, "fuel_L": 25},
      {"vehicle": "Car B", "distance_km": 450, "fuel_L": 25},
      {"vehicle": "Car C", "distance_km": 420, "fuel_L": 26}
    ]'::jsonb,
    'Rates & Speed',
    'Efficiency (Distance / Fuel)',
    'Medium',
    now()
  ),
  (
    gen_random_uuid(),
    'QR',
    'QR006',
    'Side Effects',
    'The table shows side effect rates for four drugs.',
    'If 500 people take Drug D, how many are likely to experience side effects?',
    ARRAY['A. 20', 'B. 25', 'C. 30', 'D. 35', 'E. 40'],
    'D',
    '7% of 500 = 35',
    'table',
    '[
      {"drug": "Drug A", "side_effects_%": 3},
      {"drug": "Drug B", "side_effects_%": 4},
      {"drug": "Drug C", "side_effects_%": 6},
      {"drug": "Drug D", "side_effects_%": 7}
    ]'::jsonb,
    'Percentages',
    'Percentage of Total',
    'Easy',
    now()
  );