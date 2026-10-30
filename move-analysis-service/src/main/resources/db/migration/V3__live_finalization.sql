-- A live review stays open while moves stream in and only settles once the game is finalized.
ALTER TABLE game_analyses
    ADD COLUMN IF NOT EXISTS finalized_at TIMESTAMPTZ;
