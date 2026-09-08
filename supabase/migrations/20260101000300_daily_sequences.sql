-- Daily payment sequence generator and unique code support
-- Resets every day at midnight (Asia/Jakarta timezone)
-- Ensures buyer 1 receives +1, buyer 2 receives +2, etc.

CREATE TABLE IF NOT EXISTS daily_payment_sequences (
  date DATE PRIMARY KEY,
  current_sequence INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE daily_payment_sequences ENABLE ROW LEVEL SECURITY;

-- Add unique_code column to orders if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'unique_code'
  ) THEN
    ALTER TABLE orders ADD COLUMN unique_code INTEGER;
  END IF;
END $$;

-- Add unique_code column to numbers if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'numbers' AND column_name = 'unique_code'
  ) THEN
    ALTER TABLE numbers ADD COLUMN unique_code INTEGER;
  END IF;
END $$;

-- Function to get the next sequential number for today atomically
CREATE OR REPLACE FUNCTION get_next_daily_sequence(timezone_name TEXT DEFAULT 'Asia/Jakarta')
RETURNS INTEGER AS $$
DECLARE
  today_date DATE;
  next_seq INTEGER;
BEGIN
  today_date := (NOW() AT TIME ZONE timezone_name)::DATE;

  INSERT INTO daily_payment_sequences (date, current_sequence, updated_at)
  VALUES (today_date, 1, NOW())
  ON CONFLICT (date) DO UPDATE
    SET current_sequence = daily_payment_sequences.current_sequence + 1,
        updated_at = NOW()
  RETURNING current_sequence INTO next_seq;

  RETURN next_seq;
END;
$$ LANGUAGE plpgsql;
