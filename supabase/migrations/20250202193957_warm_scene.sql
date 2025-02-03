/*
  # Add user state and preferences

  1. New Tables
    - `user_state`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `settings` (jsonb)
      - `last_code` (text)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `user_state` table
    - Add policies for authenticated users to manage their own state
*/

CREATE TABLE IF NOT EXISTS user_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  settings jsonb DEFAULT '{}',
  last_code text,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE user_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own state"
  ON user_state
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);