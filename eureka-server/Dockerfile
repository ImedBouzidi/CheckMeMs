# eureka-server — service registry (port 8761)
# Build: docker build -t checkmems/eureka-server .
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -B -q dependency:go-offline || true
COPY src src
RUN mvn -B package -DskipTests

FROM eclipse-temurin:21-jre
WORKDIR /app
# curl: used by the compose healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8761
ENTRYPOINT ["sh","-c","exec java -XX:MaxRAMPercentage=75.0 -jar /app/app.jar --spring.profiles.active=${SPRING_PROFILES_ACTIVE:-docker}"]
