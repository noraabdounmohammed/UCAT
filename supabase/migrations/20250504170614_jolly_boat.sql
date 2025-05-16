/*
  # Initial schema setup

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key, references auth.users)
      - `email` (text)
      - `name` (text)
      - `target_score` (integer)
      - `current_score` (integer)
      - `streak` (integer)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `practice_sessions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `section` (text)
      - `score` (integer)
      - `accuracy` (integer)
      - `time_taken` (integer)
      - `created_at` (timestamp)
    
    - `mock_exams`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `score` (integer)
      - `type` (text)
      - `completed_at` (timestamp)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to access their own data
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  name text,
  target_score integer DEFAULT 2900,
  current_score integer DEFAULT 0,
  streak integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create practice_sessions table
CREATE TABLE IF NOT EXISTS practice_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles ON DELETE CASCADE NOT NULL,
  section text NOT NULL,
  score integer NOT NULL,
  accuracy integer NOT NULL,
  time_taken integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create mock_exams table
CREATE TABLE IF NOT EXISTS mock_exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles ON DELETE CASCADE NOT NULL,
  score integer NOT NULL,
  type text NOT NULL,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mock_exams ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can read own practice sessions"
  ON practice_sessions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own practice sessions"
  ON practice_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own mock exams"
  ON mock_exams
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own mock exams"
  ON mock_exams
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);