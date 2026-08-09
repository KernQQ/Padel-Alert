CREATE TABLE IF NOT EXISTS padelalert_state (
  id SMALLINT PRIMARY KEY CHECK (id = 1),
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One row contains the current application state.
-- This is an intentional transition step from community.json.
