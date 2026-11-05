-- Initial schema for games-service.
-- Flyway owns the schema from here on; Hibernate runs with ddl-auto=validate.
--
-- Enum values must match the Java enums exactly (EnumType.STRING):
--   GameResult  : WHITE_WIN, BLACK_WIN, DRAW, UNKNOWN
--   GameStatus  : IN_PROGRESS, COMPLETED, ABORTED, DRAW
--   GameMode    : ONLINE, BOT, LOCAL, IMPORT
--   AnalysisStatus: NOT_REQUESTED, PENDING, REQUESTED, IN_PROGRESS, COMPLETED, FAILED

CREATE TABLE IF NOT EXISTS games (
    id                        UUID        PRIMARY KEY,

    white_player_id           VARCHAR(255),
    black_player_id           VARCHAR(255),
    owner_id                  VARCHAR(255),

    pgn                       TEXT        NOT NULL,
    fen                       VARCHAR(255),

    result                    VARCHAR(32),
    status                    VARCHAR(32),
    mode                      VARCHAR(32),

    -- jsonb columns carry arbitrary structured data (time control config, game metadata).
    time_control              JSONB,
    metadata                  JSONB,

    submitted_for_analysis    BOOLEAN     NOT NULL DEFAULT FALSE,
    analysis_status           VARCHAR(32) NOT NULL DEFAULT 'NOT_REQUESTED',
    analysis_request_id       VARCHAR(255),

    started_at                TIMESTAMPTZ,
    ended_at                  TIMESTAMPTZ,
    created_at                TIMESTAMPTZ NOT NULL,
    updated_at                TIMESTAMPTZ NOT NULL
);

-- Speed up per-owner game listings (dashboard, history page).
CREATE INDEX IF NOT EXISTS idx_games_owner_id ON games (owner_id);

-- Speed up filtering by status (e.g. fetch only COMPLETED games for analysis).
CREATE INDEX IF NOT EXISTS idx_games_status ON games (status);
