-- Phase 0 schema for the analysis service.
-- Flyway owns the schema from here on; Hibernate runs with ddl-auto=validate.
--
-- The first block adopts tables left behind by the old Hibernate ddl-auto=update model so an
-- existing local database keeps its analysis history instead of failing on the new column names.

-- ---------------------------------------------------------------------------------------------
-- Legacy adoption (no-op on a fresh database)
-- ---------------------------------------------------------------------------------------------

DO $$
BEGIN
    IF to_regclass('public.game_analyses') IS NULL
       AND to_regclass('public.analysis_requests') IS NOT NULL THEN
        ALTER TABLE public.analysis_requests RENAME TO game_analyses;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = 'game_analyses'
                 AND column_name = 'request_source')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_schema = 'public' AND table_name = 'game_analyses'
                         AND column_name = 'requested_by') THEN
        ALTER TABLE public.game_analyses RENAME COLUMN request_source TO requested_by;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = 'game_analyses'
                 AND column_name = 'result_summary')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_schema = 'public' AND table_name = 'game_analyses'
                         AND column_name = 'summary') THEN
        ALTER TABLE public.game_analyses RENAME COLUMN result_summary TO summary;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = 'move_analyses'
                 AND column_name = 'analysis_request_id')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_schema = 'public' AND table_name = 'move_analyses'
                         AND column_name = 'game_analysis_id') THEN
        ALTER TABLE public.move_analyses RENAME COLUMN analysis_request_id TO game_analysis_id;
    END IF;
END $$;

-- The old status constraint only knew PENDING/IN_PROGRESS/COMPLETED/FAILED.
ALTER TABLE IF EXISTS public.game_analyses
    DROP CONSTRAINT IF EXISTS analysis_requests_status_check;

-- ---------------------------------------------------------------------------------------------
-- Core tables
-- ---------------------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS game_analyses (
    id                UUID PRIMARY KEY,
    game_id           UUID         NOT NULL,
    profile           VARCHAR(32)  NOT NULL DEFAULT 'STANDARD',
    status            VARCHAR(32)  NOT NULL,
    pgn               TEXT         NOT NULL,
    fen               TEXT,
    expected_plies    INTEGER      NOT NULL DEFAULT 0,
    completed_plies   INTEGER      NOT NULL DEFAULT 0,
    engine_name       VARCHAR(128),
    engine_version    VARCHAR(128),
    config_version    VARCHAR(64),
    analysis_config   JSONB,
    accuracy_white    NUMERIC(5, 2),
    accuracy_black    NUMERIC(5, 2),
    acpl_white        INTEGER,
    acpl_black        INTEGER,
    requested_by      VARCHAR(128),
    white_player_id   VARCHAR(128),
    black_player_id   VARCHAR(128),
    summary           JSONB,
    last_error        TEXT,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    completed_at      TIMESTAMPTZ,
    version           BIGINT       NOT NULL DEFAULT 0,
    CONSTRAINT uq_game_analyses_game_profile UNIQUE (game_id, profile)
);

CREATE TABLE IF NOT EXISTS move_analyses (
    id                UUID PRIMARY KEY,
    game_analysis_id  UUID         NOT NULL,
    game_id           UUID,
    ply               INTEGER      NOT NULL,
    move_number       INTEGER,
    color             VARCHAR(16),
    san               VARCHAR(32),
    uci               VARCHAR(16),
    fen_before        TEXT,
    fen_after         TEXT,
    eval_before_cp    INTEGER,
    eval_after_cp     INTEGER,
    eval_before_mate  INTEGER,
    eval_after_mate   INTEGER,
    best_move_uci     VARCHAR(16),
    best_move_san     VARCHAR(32),
    best_move_eval_cp INTEGER,
    best_move_eval_mate INTEGER,
    difference_cp     INTEGER,
    cp_loss           INTEGER,
    win_prob_loss     DOUBLE PRECISION,
    classification    VARCHAR(32),
    pv                TEXT,
    depth             INTEGER,
    seldepth          INTEGER,
    multipv           INTEGER,
    nodes             BIGINT,
    elapsed_ms        BIGINT,
    engine_version    VARCHAR(128),
    config_version    VARCHAR(64),
    is_preliminary    BOOLEAN      NOT NULL DEFAULT TRUE,
    status            VARCHAR(32)  NOT NULL DEFAULT 'PENDING',
    error             TEXT,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    version           BIGINT       NOT NULL DEFAULT 0,
    CONSTRAINT uq_move_analyses_key UNIQUE (game_analysis_id, ply, engine_version, config_version)
);

-- ---------------------------------------------------------------------------------------------
-- Bring an adopted legacy table up to the new model.
-- ALTER ... IF NOT EXISTS makes every statement a no-op on a freshly created table.
-- ---------------------------------------------------------------------------------------------

ALTER TABLE game_analyses
    ADD COLUMN IF NOT EXISTS profile           VARCHAR(32)  NOT NULL DEFAULT 'STANDARD',
    ADD COLUMN IF NOT EXISTS expected_plies    INTEGER      NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS completed_plies   INTEGER      NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS engine_name       VARCHAR(128),
    ADD COLUMN IF NOT EXISTS engine_version    VARCHAR(128),
    ADD COLUMN IF NOT EXISTS config_version    VARCHAR(64),
    ADD COLUMN IF NOT EXISTS analysis_config   JSONB,
    ADD COLUMN IF NOT EXISTS accuracy_white    NUMERIC(5, 2),
    ADD COLUMN IF NOT EXISTS accuracy_black    NUMERIC(5, 2),
    ADD COLUMN IF NOT EXISTS acpl_white        INTEGER,
    ADD COLUMN IF NOT EXISTS acpl_black        INTEGER,
    ADD COLUMN IF NOT EXISTS requested_by      VARCHAR(128),
    ADD COLUMN IF NOT EXISTS white_player_id   VARCHAR(128),
    ADD COLUMN IF NOT EXISTS black_player_id   VARCHAR(128),
    ADD COLUMN IF NOT EXISTS summary           JSONB,
    ADD COLUMN IF NOT EXISTS last_error        TEXT,
    ADD COLUMN IF NOT EXISTS completed_at      TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS version           BIGINT       NOT NULL DEFAULT 0;

UPDATE game_analyses SET game_id = id WHERE game_id IS NULL;
UPDATE game_analyses SET profile = 'STANDARD' WHERE profile IS NULL;
UPDATE game_analyses SET status = 'PROCESSING' WHERE status = 'IN_PROGRESS';
UPDATE game_analyses SET status = 'PENDING' WHERE status IS NULL;

ALTER TABLE game_analyses ALTER COLUMN game_id SET NOT NULL;
ALTER TABLE game_analyses ALTER COLUMN profile SET NOT NULL;
ALTER TABLE game_analyses ALTER COLUMN status SET NOT NULL;
ALTER TABLE game_analyses ALTER COLUMN status SET DEFAULT 'PENDING';

ALTER TABLE move_analyses
    ADD COLUMN IF NOT EXISTS game_analysis_id UUID,
    ADD COLUMN IF NOT EXISTS win_prob_loss     DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS depth             INTEGER,
    ADD COLUMN IF NOT EXISTS seldepth          INTEGER,
    ADD COLUMN IF NOT EXISTS multipv           INTEGER,
    ADD COLUMN IF NOT EXISTS nodes             BIGINT,
    ADD COLUMN IF NOT EXISTS elapsed_ms        BIGINT,
    ADD COLUMN IF NOT EXISTS engine_version    VARCHAR(128),
    ADD COLUMN IF NOT EXISTS config_version    VARCHAR(64),
    ADD COLUMN IF NOT EXISTS is_preliminary    BOOLEAN      NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS status            VARCHAR(32)  NOT NULL DEFAULT 'PENDING',
    ADD COLUMN IF NOT EXISTS error             TEXT,
    ADD COLUMN IF NOT EXISTS updated_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS version           BIGINT       NOT NULL DEFAULT 0;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = 'move_analyses'
                 AND column_name = 'analysis_request_id') THEN
        UPDATE move_analyses
        SET game_analysis_id = analysis_request_id
        WHERE game_analysis_id IS NULL AND analysis_request_id IS NOT NULL;
    END IF;
END $$;

-- Rows inherited from the old final-analysis model are finished results, not preliminary work.
UPDATE move_analyses
SET status = 'COMPLETED', is_preliminary = FALSE
WHERE status = 'PENDING' AND is_preliminary = TRUE;

ALTER TABLE move_analyses ALTER COLUMN game_analysis_id SET NOT NULL;
ALTER TABLE move_analyses ALTER COLUMN ply SET NOT NULL;
ALTER TABLE move_analyses ALTER COLUMN status SET NOT NULL;
ALTER TABLE move_analyses ALTER COLUMN is_preliminary SET NOT NULL;

UPDATE game_analyses a
SET expected_plies = stats.cnt,
    completed_plies = stats.cnt
FROM (
    SELECT game_analysis_id, count(*) AS cnt
    FROM move_analyses
    GROUP BY game_analysis_id
) AS stats
WHERE a.id = stats.game_analysis_id
  AND a.expected_plies = 0
  AND a.completed_plies = 0;

UPDATE game_analyses
SET completed_at = updated_at
WHERE status = 'COMPLETED' AND completed_at IS NULL;

-- ---------------------------------------------------------------------------------------------
-- Analysis queue
-- ---------------------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS analysis_jobs (
    id                UUID PRIMARY KEY,
    game_analysis_id  UUID         NOT NULL REFERENCES game_analyses (id) ON DELETE CASCADE,
    job_type          VARCHAR(32)  NOT NULL,
    status            VARCHAR(32)  NOT NULL,
    priority          INTEGER      NOT NULL DEFAULT 0,
    payload           JSONB,
    attempts          INTEGER      NOT NULL DEFAULT 0,
    max_attempts      INTEGER      NOT NULL DEFAULT 3,
    available_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    locked_until      TIMESTAMPTZ,
    claimed_at        TIMESTAMPTZ,
    claimed_by        VARCHAR(128),
    last_error        TEXT,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------------------------
-- Keys, indexes and constraints (idempotent for both fresh and adopted databases)
-- ---------------------------------------------------------------------------------------------

CREATE UNIQUE INDEX IF NOT EXISTS uq_game_analyses_game_profile
    ON game_analyses (game_id, profile);
CREATE INDEX IF NOT EXISTS idx_game_analyses_requested_by
    ON game_analyses (requested_by, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_analyses_status
    ON game_analyses (status, created_at);

CREATE UNIQUE INDEX IF NOT EXISTS uq_move_analyses_key
    ON move_analyses (game_analysis_id, ply, engine_version, config_version);
CREATE INDEX IF NOT EXISTS idx_move_analyses_game_ply
    ON move_analyses (game_id, ply);
CREATE INDEX IF NOT EXISTS idx_move_analyses_analysis_ply
    ON move_analyses (game_analysis_id, ply);
CREATE INDEX IF NOT EXISTS idx_move_analyses_status
    ON move_analyses (status, updated_at);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint
                   WHERE conname = 'fk_move_analyses_game_analysis') THEN
        ALTER TABLE move_analyses
            ADD CONSTRAINT fk_move_analyses_game_analysis
            FOREIGN KEY (game_analysis_id) REFERENCES game_analyses (id) ON DELETE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_analysis_jobs_claim
    ON analysis_jobs (status, available_at, priority DESC, created_at);
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_game
    ON analysis_jobs (game_analysis_id, created_at DESC);

-- At most one active job per analysis and job type. Failed/dead jobs may be retried later.
CREATE UNIQUE INDEX IF NOT EXISTS uq_analysis_jobs_active
    ON analysis_jobs (game_analysis_id, job_type)
    WHERE status IN ('QUEUED', 'RUNNING');
