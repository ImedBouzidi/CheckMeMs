-- Runs once at first container start (docker-entrypoint-initdb.d) as the superuser
-- (POSTGRES_USER, see docker-compose.yml).
--
-- Database names must match what each service's application-docker.yml builds:
--   games-service / user-profile-service -> ${DB_NAME}            (see compose)
--   learning-service                     -> chess_${APP_NAME}     (chess_learning-service)
--   move-analysis-service                -> chess_${APP_NAME}     (chess_analysis-service)
-- Dashed names are valid, but must be quoted here.

CREATE DATABASE "chess_user_profile" OWNER "chess_user";
CREATE DATABASE "chess_game" OWNER "chess_user";
CREATE DATABASE "chess_learning-service" OWNER "chess_user";
CREATE DATABASE "chess_analysis-service" OWNER "chess_user";
CREATE DATABASE "keycloak" OWNER "chess_user";
