/*
  # Task History and Documentation Schema

  1. New Tables
    - `task_history`
      - `id` (uuid, primary key)
      - `task_id` (text)
      - `title` (text)
      - `description` (text)
      - `completed_at` (timestamptz)
      - `user_id` (uuid, references auth.users)
    - `documentation_entries`
      - `id` (uuid, primary key)
      - `title` (text)
      - `content` (text)
      - `created_at` (timestamptz)
      - `tasks_completed` (int)
      - `user_id` (uuid, references auth.users)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users
*/

CREATE TABLE IF NOT EXISTS task_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  completed_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) NOT NULL
);

CREATE TABLE IF NOT EXISTS documentation_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  tasks_completed int NOT NULL,
  user_id uuid REFERENCES auth.users(id) NOT NULL
);

ALTER TABLE task_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentation_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own task history"
  ON task_history
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own task history"
  ON task_history
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own documentation"
  ON documentation_entries
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documentation"
  ON documentation_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);