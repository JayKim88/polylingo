-- Add startDate and endDate columns to daily_usage table for robust synchronization
-- This enables 3-piece validation: originalTransactionIdentifierIOS + startDate + endDate

-- Add the new columns
ALTER TABLE daily_usage 
ADD COLUMN IF NOT EXISTS start_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS end_date TIMESTAMP WITH TIME ZONE;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_daily_usage_dates ON daily_usage(original_transaction_identifier_ios, start_date, end_date);

-- Update existing records with start_date and end_date from user_subscriptions
-- This backfills existing data with the correct subscription dates
UPDATE daily_usage 
SET 
    start_date = us.start_date,
    end_date = us.end_date
FROM user_subscriptions us 
WHERE daily_usage.original_transaction_identifier_ios = us.original_transaction_identifier_ios 
    AND us.is_active = true 
    AND daily_usage.start_date IS NULL;

-- Make start_date NOT NULL after backfilling
ALTER TABLE daily_usage ALTER COLUMN start_date SET NOT NULL;

-- end_date can be NULL for free plans