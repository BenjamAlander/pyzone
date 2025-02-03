/*
  # Add columns to task_history table

  1. Changes
    - Add `difficulty` column to store task difficulty level
    - Add `category` column to store task category

  2. Security
    - No changes to existing RLS policies needed
*/

-- Add new columns to task_history table
ALTER TABLE task_history 
ADD COLUMN IF NOT EXISTS difficulty text,
ADD COLUMN IF NOT EXISTS category text;

-- Set default values for existing rows
UPDATE task_history 
SET 
  difficulty = 'medium',
  category = 'Custom'
WHERE difficulty IS NULL OR category IS NULL;

-- Make the new columns required for future inserts
ALTER TABLE task_history 
ALTER COLUMN difficulty SET NOT NULL,
ALTER COLUMN category SET NOT NULL;