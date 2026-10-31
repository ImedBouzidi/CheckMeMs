-- The detected opening identity surfaces on the review UI ("C60 · Ruy Lopez").
ALTER TABLE game_analyses
    ADD COLUMN IF NOT EXISTS opening_eco VARCHAR(3),
    ADD COLUMN IF NOT EXISTS opening_name VARCHAR(128);
