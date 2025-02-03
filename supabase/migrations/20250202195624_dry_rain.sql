/*
  # Add updated_at column to task_history table

  1. Changes
    - Add `updated_at` column to `task_history` table with default value of now()
    - Set default value for existing rows
*/

-- Add updated_at column if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'task_history' 
    AND column_name = 'updated_at'
  ) THEN 
    ALTER TABLE task_history 
    ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;