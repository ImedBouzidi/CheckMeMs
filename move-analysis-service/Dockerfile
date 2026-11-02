# move-analysis-service — (port 8082), runs Stockfish beside the app.
#
# NOTE: the Stockfish sources live outside this folder (../stockfish/src), so the build
# needs the extra build context. Compose provides it via `additional_contexts`; standalone:
#   docker build -t checkmems/move-analysis-service \
#     --build-context stockfish=../stockfish ./move-analysis-service
#
# Stage 1 is x86-64 only; on ARM (Apple Silicon) use binaries for the target platform or
# change ARCH (see https://github.com/official-stockfish/Stockfish).
FROM debian:bookworm-slim AS stockfish-build
RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*
COPY --from=stockfish src /build/src
COPY --from=stockfish scripts /build/scripts
WORKDIR /build/src
# The first build downloads the default NNUE nets (needs network access).
RUN make -j4 net && make -j4 build ARCH=x86-64

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
COPY --from=stockfish-build /build/src/stockfish /usr/bin/stockfish
# Config default in application-docker.yml
ENV STOCKFISH_PATH=/usr/bin/stockfish
EXPOSE 8082
ENTRYPOINT ["sh","-c","exec java -XX:MaxRAMPercentage=75.0 -jar /app/app.jar --spring.profiles.active=${SPRING_PROFILES_ACTIVE:-docker}"]
