# Game Service - Refactor Plan & Suggestions

This document provides a concrete plan to refactor `game-service` to follow best practices and implement the flow: **connect with analysis-service, store games for analysis**.

## 1) Current State Assessment

### What exists
- Minimal source: only `com.chessplatform.GameServiceApplication` (package `com.chessplatform.game`).
- Config: `application.yml`, `application-local.yml`, `application-docker.yml` with Postgres, Flyway, Redis, RabbitMQ, OAuth2 Resource Server.
- Dependencies: web, actuator, validation, JPA, Postgres, Flyway, AMQP, Redis, OAuth2 RS, springdoc, Lombok, test.
- Routed via API Gateway: `Path=/api/games/**` -> `http://localhost:8094` (game-service).
- No controllers/services/repos/models/migrations in source (target dirs missing).

### Gaps vs intended flow
- No domain model for games/moves/PGN.
- No persistence layer or Flyway migrations.
- No API to create/save/submit games.
- No integration with `analysis-service` (route exists in gateway to port 8082, no source in repo).
- No messaging/events or sync client to trigger analysis and store games for analysis.
- No security/DTO/validation/error handling structure.

## 2) Target Architecture (Best Practices)

Follow a clean layered architecture consistent with other services:

```
game-service/
├── config/           # Security, RabbitMQ, WebClient/Feign, Redis, OpenAPI
├── controller/       # REST controllers, DTO validation
├── dto/              # request/response/event DTOs (records or POJOs)
├── exception/        # custom exceptions + @ControllerAdvice
├── model/entity/     # JPA entities (Game, Move, GamePlayer, etc.)
├── repository/       # Spring Data JPA repos
├── service/          # business logic, orchestration
├── service/client/   # analysis-service client (RestTemplate/WebClient/Feign)
├── service/mapper/   # MapStruct/manual mappers
├── messaging/        # producers/listeners (events)
└── GameServiceApplication.java
```

Also consider:
- Use `@Transactional` at service layer.
- DTOs separate from entities (never expose entities).
- Validation via `@Valid` + Bean Validation.
- Global exception handling with proper HTTP codes.
- Pagination for listing games.
- Audit fields (`createdAt`, `updatedAt`, `createdBy`).
- Soft deletes only if needed; otherwise hard delete with care.
- Use enums for game status/result/mode.

## 3) Domain Model Proposal

Suggested entities:

| Entity | Purpose | Notes |
| --- | --- | --- |
| `Game` | Core game aggregate | `id` (UUID), `pgn` (TEXT), `fen` (optional current), `result` (enum), `status` (enum: IN_PROGRESS/COMPLETED/ABORTED), `mode` (enum: ONLINE/BOT/LOCAL), `timeControl` (json/string), `whitePlayerId`, `blackPlayerId`, `startedAt`, `endedAt`, `metadata` (JSONB), `submittedForAnalysis` (bool), `analysisRequestId`, `analysisStatus` (enum: PENDING/REQUESTED/COMPLETED/FAILED). |
| `GameMove` | Move history (optional) | `id`, `game_id` FK, `moveNumber`, `ply`, `san`, `uci`, `fenAfter`, `color`. Useful for replay/analysis without parsing PGN each time. |
| `GameAnalysisRef` | Link to analysis | `id`, `game_id` FK, `analysisId`, `analysisUrl`, `status`, timestamps. Decouples game-service from analysis internals. |

Enums: `GameResult` (WHITE_WIN/BLACK_WIN/DRAW/UNKNOWN), `GameStatus`, `GameMode`, `AnalysisStatus`.

Migrations (Flyway): `V1__create_games_table.sql`, `V2__create_game_moves.sql`, `V3__create_game_analysis_ref.sql`. Use `uuid-ossp` or `gen_random_uuid()`; ensure extension available or use app-side generation.

## 4) API Design

Base path: `/api/games` (matches gateway). Suggest endpoints:

| Method | Path | Purpose | Auth | Notes |
| --- | --- | --- | --- | --- |
| `POST` | `/` | Create/save a completed game | Authenticated | Accept PGN/FEN/moves/result/players. Validate. Persist. Trigger analysis submission. |
| `POST` | `/{id}/submit-analysis` | Manually submit stored game for analysis | Authenticated (owner) | Idempotent; updates status/creates request. |
| `GET` | `/{id}` | Get game details | Authenticated/owner or public depending on rules | Include analysis status/ref if exists. |
| `GET` | `/` | List games for current user | Authenticated | Paginated, filter by status/result/mode. |
| `GET` | `/{id}/pgn` | Get raw PGN | Authenticated/owner | For export/replay. |
| `DELETE` | `/{id}` | Delete game | Authenticated (owner) | Consider authorization + soft delete? |
| `POST` | `/import` | Import PGN (bulk/single) | Authenticated | Validate PGN format. |

DTOs: `CreateGameRequest` (validated), `GameResponse`, `GameSummaryResponse`, `SubmitAnalysisResponse`. Use Java records where appropriate.

## 5) Integration with Analysis-Service (Store Games for Analysis)

There are two common patterns; recommend hybrid for resilience:

### Option A: Synchronous REST (direct call)
- Client: `WebClient` (non-blocking) or `RestTemplate` (simple). Prefer WebClient.
- Endpoint assumption (based on gateway): `POST http://analysis-service/api/analysis/games` or `POST /api/analysis/submit` with body containing `gameId`, `pgn`, `fen`, `metadata`.
- Use timeouts, retries (Resilience4j), circuit breaker, and fallback.
- Store `analysisRequestId` returned to correlate later.
- Pros: immediate feedback. Cons: coupling, analysis-service must be up.

### Option B: Asynchronous Messaging (event-driven)
- Publish `GameSavedEvent` (or `GameCompletedEvent`) to RabbitMQ (exchange/queue). 
- Analysis-service consumes and processes; can callback via REST/webhook or publish result back (`AnalysisCompletedEvent`).
- Game-service listens for results to update `analysisStatus`/`GameAnalysisRef`.
- Pros: decoupled, resilient, scalable. Cons: eventual consistency.
- Use `@JsonTypeInfo`/schema, dead-letter queues, idempotent consumers.

### Recommendation
- Primary: publish event on game save/completion (`GameCompletedEvent`) with `gameId`, `pgn`, `whitePlayerId`, `blackPlayerId`, `result`.
- Fallback: also support `POST /{id}/submit-analysis` triggering REST call if messaging unavailable.
- On analysis completion, update game record (via callback endpoint or event listener). Expose status to UI.
- Store games for analysis = persist in `games` table (with PGN) AND submit to analysis-service (via event/REST). Both needed.

Also need to add configuration:
```yaml
analysis:
  service:
    url: http://localhost:8082
    submit-path: /api/analysis/games
```

## 6) Security, Config, Best Practices

- **Security**: Use OAuth2 Resource Server (already configured). Enforce ownership checks in service layer (user can only access their games). Add method security if needed.
- **Validation**: `@NotBlank` on PGN, validate result consistency, etc.
- **Error Handling**: `@RestControllerAdvice` with `Problem Details` (RFC7807) style errors.
- **Transactions**: `@Transactional` on write operations; read-only for queries.
- **Mapping**: Avoid exposing internal IDs unnecessarily; use DTOs.
- **Logging**: Structured logging, no PGN in debug logs if sensitive? PGN is game data but can be large.
- **API Docs**: springdoc already present.
- **Observability**: Actuator enabled.
- **Resilience**: For inter-service calls use WebClient + timeouts + Resilience4j (circuit breaker/retry).
- **Idempotency**: For submit-analysis use idempotency keys or check existing submission.
- **Data types**: Store PGN as `TEXT` (Postgres). Use `JSONB` for metadata/timeControl if flexible.

## 7) Concrete Implementation Steps

### Step 1: Project structure setup
Create packages under `com.chessplatform.game` (note app is in that package root).
- `config/`, `controller/`, `dto/`, `dto/request/`, `dto/response/`, `exception/`, `model/`, `repository/`, `service/`, `service/client/`, `messaging/`, `mapper/`

### Step 2: Dependencies
Add to `pom.xml` if missing:
- `spring-boot-starter-webflux` (for WebClient) or `spring-cloud-starter-openfeign`
- `io.github.resilience4j:resilience4j-spring-boot3` (circuit breaker/retry)
- `org.mapstruct:mapstruct` (optional but good)
- `org.apache.commons:commons-lang3` 
- `com.fasterxml.jackson.datatype:jackson-datatype-jsr310`

Note: need to add versions or use parent BOM if exists.

### Step 3: Migrations
Create `src/main/resources/db/migration/`:
- `V1__init_games.sql` - games table with indexes (owner, status, created_at)
- `V2__init_game_moves.sql`
- `V3__init_analysis_refs.sql`

Example schema sketch:
```sql
CREATE TABLE games (
  id UUID PRIMARY KEY,
  white_player_id VARCHAR(255),
  black_player_id VARCHAR(255),
  pgn TEXT NOT NULL,
  fen VARCHAR(255),
  result VARCHAR(32),
  status VARCHAR(32),
  mode VARCHAR(32),
  time_control JSONB,
  metadata JSONB,
  submitted_for_analysis BOOLEAN DEFAULT FALSE,
  analysis_status VARCHAR(32),
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_games_white ON games(white_player_id);
CREATE INDEX idx_games_black ON games(black_player_id);
CREATE INDEX idx_games_status ON games(status);
```

### Step 4: Domain & Repos
Entities with JPA annotations, Lombok `@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor` or use records carefully. Repos extend `JpaRepository<Game, UUID>` with custom methods.

### Step 5: Service layer
`GameService` interface + impl. Methods: `createGame`, `getGame`, `listUserGames`, `submitForAnalysis`, `updateAnalysisStatus`. Handle transactions, validation, ownership checks.

### Step 6: Analysis client + messaging
- Config for `WebClient` bean pointing to analysis-service.
- `AnalysisClient` service with `submitGame(GameDto)` method.
- RabbitMQ config: `@EnableRabbit`, exchange/queue/binding for `game.events` or `analysis.exchange`. Publish `GameSavedEvent`.
- Add event classes in `messaging/event/`.

### Step 7: Controller
REST controller with proper mapping, `@Valid`, security context to get user id (from JWT/sub claim).

### Step 8: Security config
Add `SecurityConfig` similar to user-profile-service (permit actuator/health/swagger, require auth otherwise). Configure resource server JWT.

### Step 9: Error handling
`GlobalExceptionHandler` with `@ControllerAdvice`, handle `EntityNotFoundException`, `AccessDeniedException`, `MethodArgumentNotValidException`, etc.

### Step 10: Testing
Unit tests for service, integration tests with `@SpringBootTest` + Testcontainers for Postgres/RabbitMQ.

## 8) Quick Start Checklist

- [ ] Create package structure under `com.chessplatform.game`
- [ ] Add missing dependencies to `pom.xml` (webflux/resilience4j/mapstruct as needed)
- [ ] Create Flyway migrations in `src/main/resources/db/migration/`
- [ ] Implement entities, repos, DTOs
- [ ] Implement service with transaction management
- [ ] Implement analysis client (WebClient) + RabbitMQ producer
- [ ] Implement REST controllers with validation
- [ ] Add SecurityConfig and GlobalExceptionHandler
- [ ] Configure application-local.yml with analysis-service URL
- [ ] Test endpoints via gateway
- [ ] Add correlation IDs/logging

## 9) Notes & Recommendations

- **Package naming**: App is `com.chessplatform.game` (matches other services style). Be consistent.
- **User identity**: Extract user id from JWT (`sub` or custom claim). Store as `whitePlayerId`/`blackPlayerId` or owner id.
- **PGN validation**: Consider using chess libraries (e.g., `chesslib` or `chess.js` on backend) to validate PGN structure.
- **Analysis-service contract**: Since source not present, define a flexible contract (accept PGN + gameId). Make client configurable.
- **Event schema**: Version events for backward compatibility.
- **Rate limiting**: Consider for submit-analysis to prevent abuse.
- **Storage**: For large PGN collections, consider separate storage or compression if needed.
- **Observability**: Add `@Observed`/micrometer tracing if available.

## Example Minimal Skel (for reference)

```java
// Game.java
@Entity
@Table(name = "games")
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
public class Game {
  @Id @GeneratedValue private UUID id;
  @Column(columnDefinition = "TEXT") private String pgn;
  @Enumerated(EnumType.STRING) private GameStatus status;
  @Enumerated(EnumType.STRING) private AnalysisStatus analysisStatus;
  private Boolean submittedForAnalysis;
  private OffsetDateTime createdAt;
  @PrePersist void pre() { createdAt = OffsetDateTime.now(); updatedAt = createdAt; }
}
```

This plan should give you a clear path to refactor game-service to best practices and implement the flow to store games and connect with analysis-service.
