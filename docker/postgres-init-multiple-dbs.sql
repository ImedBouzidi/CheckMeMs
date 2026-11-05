-- Runs once at first container start (docker-entrypoint-initdb.d) as the superuser
-- (POSTGRES_USER, see docker-compose.yml).
--
-- Database names must match what each service's application-docker.yml builds:
--   games-service / user-profile-service -> ${DB_NAME}            (see compose)
--   learning-service                     -> chess_${APP_NAME}     (chess_learning-service)
--   move-analysis-service                -> chess_${APP_NAME}     (chess_analysis-service)
-- Dashed names are valid, but must be quoted here.
--
-- The Postgres image already creates POSTGRES_DB (chess_user_profile) before
-- this script runs. A plain CREATE DATABASE here would abort the whole script
-- under the entrypoint's ON_ERROR_STOP=1, leaving the other databases missing.
-- Every statement is therefore conditional; the script is safe to re-run.

SELECT 'CREATE DATABASE "chess_user_profile" OWNER "chess_user"'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'chess_user_profile')\gexec

SELECT 'CREATE DATABASE "chess_game" OWNER "chess_user"'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'chess_game')\gexec

SELECT 'CREATE DATABASE "chess_learning-service" OWNER "chess_user"'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'chess_learning-service')\gexec

SELECT 'CREATE DATABASE "chess_analysis-service" OWNER "chess_user"'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'chess_analysis-service')\gexec

SELECT 'CREATE DATABASE "keycloak" OWNER "chess_user"'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'keycloak')\gexec
