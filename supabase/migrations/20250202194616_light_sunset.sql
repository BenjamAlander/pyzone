/*
  # Add completed column to task_history table

  1. Changes
    - Add `completed` column to `task_history` table
    - Set default value to false for existing rows
    - Make column required for future inserts

  2. Purpose
    - Track task completion status
    - Enable automatic progress tracking
    - Ensure data consistency with non-null values
*/

ALTER TABLE task_history 
ADD COLUMN IF NOT EXISTS completed boolean DEFAULT false;

-- Set default values for existing rows
UPDATE task_history 
SET completed = false
WHERE completed IS NULL;

-- Make the new column required for future inserts
ALTER TABLE task_history 
ALTER COLUMN completed SET NOT NULL;