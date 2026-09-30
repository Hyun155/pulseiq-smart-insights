CREATE TABLE IF NOT EXISTS medication_schedules (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  medication_name TEXT NOT NULL CHECK (length(trim(medication_name)) > 0),
  dosage TEXT NOT NULL CHECK (length(trim(dosage)) > 0),
  reminder_time TIME NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS medication_schedules_due_idx
  ON medication_schedules (is_active, start_date, end_date, reminder_time);
