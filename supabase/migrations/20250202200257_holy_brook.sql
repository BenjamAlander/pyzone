/*
  # Add custom tasks table and task counter

  1. New Tables
    - `custom_tasks`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `title` (text)
      - `description` (text)
      - `category` (text)
      - `difficulty` (text)
      - `code` (text)
      - `created_at` (timestamptz)
  2. Security
    - Enable RLS on `custom_tasks` table
    - Add policies for authenticated users
*/

CREATE TABLE IF NOT EXISTS custom_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  difficulty text NOT NULL,
  code text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE custom_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own custom tasks"
  ON custom_tasks
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);