# move-analysis-service — (port 8082), runs Stockfish beside the app.
#
# Stockfish is supplied as a pre-built x86-64 binary from the stockfish build
# context (stockfish/stockfish-linux-x86-64-universal), so this image requires
# no network access, no C++ toolchain, and no NNUE weight download at build time.
#
# The build context is provided by Compose via `additional_contexts`:
#   additional_contexts:
#     - "stockfish=./stockfish"
#
# Standalone build:
#   docker build -t checkmems/move-analysis-service \
#     --build-context stockfish=../stockfish ./move-analysis-service
#
# On ARM (Apple Silicon / Graviton) replace the binary with the matching
# official release from https://github.com/official-stockfish/Stockfish/releases
# and rebuild.

FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -B -q dependency:go-offline || true
COPY src src
RUN mvn -B package -DskipTests

FROM eclipse-temurin:21-jre
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/target/*.jar app.jar
# Copy the pre-built universal binary; rename it to 'stockfish' for a stable STOCKFISH_PATH.
COPY --from=stockfish stockfish-linux-x86-64-universal /usr/bin/stockfish
RUN chmod +x /usr/bin/stockfish
# Config default in application-docker.yml
ENV STOCKFISH_PATH=/usr/bin/stockfish
EXPOSE 8082
ENTRYPOINT ["sh","-c","exec java -XX:MaxRAMPercentage=75.0 -jar /app/app.jar --spring.profiles.active=${SPRING_PROFILES_ACTIVE:-docker}"]
