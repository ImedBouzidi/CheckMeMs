-- Tables adopted from the previous Hibernate ddl-auto=update model were created without the
-- column defaults that the new schema declares. Align them so raw inserts and the analysis queue
-- behave the same on upgraded and fresh databases.

ALTER TABLE game_analyses ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE game_analyses ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE move_analyses ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE move_analyses ALTER COLUMN updated_at SET DEFAULT now();
