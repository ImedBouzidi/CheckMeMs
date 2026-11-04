// CheckMeMS CI/CD pipeline
//
// Requirements on the build agent (label 'docker'):
//   - Docker Engine + Compose v2 (`docker compose version` works)
//   - a credential with id 'dockerhub-creds' when PUSH_IMAGES is enabled
//
// Flow: validate compose -> unit tests (parallel, in containers) -> build images ->
// optional push -> optional smoke deploy of the full stack on the build host.

pipeline {

    agent { label 'docker' }

    options {
        timestamps()
        ansiColor('xterm')
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '30'))
        timeout(time: 90, unit: 'MINUTES')
    }

    environment {
        // BuildKit makes compose builds faster and keeps the Maven cache warm.
        COMPOSE_DOCKER_CLI_BUILD = '1'
        DOCKER_BUILDKIT = '1'
        JAVA_SERVICE_NAMES = 'eureka-server api-gateway games-service user-profile-service learning-service move-analysis-service kafka-service'
    }

    parameters {
        booleanParam(name: 'RUN_TESTS', defaultValue: true,
            description: 'Run unit tests for the Java services and build the Angular app')
        booleanParam(name: 'PUSH_IMAGES', defaultValue: true,
            description: 'Push built images to DOCKER_REGISTRY after a successful build (needs credential dockerhub-creds)')
        string(name: 'DOCKER_REGISTRY', defaultValue: 'docker.io/imedbennington',
            description: 'Registry path. Docker Hub: docker.io/<username> (or just <username>)')
        booleanParam(name: 'DEPLOY_HOST', defaultValue: false,
            description: 'Bring the full docker-compose stack up on this host after build')
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Validate compose file') {
            steps {
                sh 'docker compose -f docker-compose.yml config -q'
            }
        }

        stage('Start test dependencies') {
            when { expression { params.RUN_TESTS } }
            steps {
                sh '''
                    # Keycloak first: it is the component most likely to fail
                    # (realm import, DB connect), so fail fast before Kafka,
                    # Eureka and the test matrix have any time invested.
                    # It still must boot after the `keycloak` database exists,
                    # so postgres starts now and that DB is created below
                    # BEFORE Keycloak comes up.
                    docker compose up -d --wait postgres

                    # The compose postgres superuser is chess_user, while the
                    # service .env files use imed/admin. Create that role and
                    # make the service databases owned by it.
                    if ! docker compose exec -T postgres \
                        psql -U chess_user -d postgres -tAc \
                        "SELECT 1 FROM pg_roles WHERE rolname = 'imed'" |
                        grep -q 1; then
                        docker compose exec -T postgres \
                            psql -U chess_user -d postgres -v ON_ERROR_STOP=1 \
                            -c "CREATE ROLE imed LOGIN PASSWORD 'admin' CREATEDB;"
                    else
                        docker compose exec -T postgres \
                            psql -U chess_user -d postgres -v ON_ERROR_STOP=1 \
                            -c "ALTER ROLE imed WITH LOGIN PASSWORD 'admin' CREATEDB;"
                    fi

                    # The PostgreSQL init script only runs on an empty pgdata
                    # volume, so create or re-own databases when Jenkins reuses
                    # one. Use createdb/printf instead of SQL with quoted names:
                    # Groovy consumes the backslashes needed by CREATE DATABASE.
                    for db in chess_game chess_user_profile \
                              chess_learning-service chess_analysis-service; do
                        if ! docker compose exec -T postgres \
                            psql -U chess_user -d postgres -tAc \
                            "SELECT 1 FROM pg_database WHERE datname = '$db'" |
                            grep -q 1; then
                            docker compose exec -T postgres \
                                createdb -U chess_user -O imed "$db"
                        else
                            printf 'ALTER DATABASE "%s" OWNER TO imed;' "$db" |
                                docker compose exec -T postgres \
                                    psql -U chess_user -d postgres -v ON_ERROR_STOP=1
                        fi
                    done

                    # Keycloak keeps using the compose superuser.
                    if ! docker compose exec -T postgres \
                        psql -U chess_user -d postgres -tAc \
                        "SELECT 1 FROM pg_database WHERE datname = 'keycloak'" |
                        grep -q 1; then
                        docker compose exec -T postgres \
                            createdb -U chess_user -O chess_user keycloak
                    fi

                    # Keycloak DB exists now -> boot Keycloak (auto-builds the
                    # imedbennington/keycloak image on first use) and wait for
                    # the realm import + health to be green.
                    KEYCLOAK_HOST_PORT=0 docker compose up -d --wait keycloak

                    # Kafka and Eureka start after Keycloak is verified.
                    # Compose health-gates each one, so --wait blocks until
                    # they are all ready.
                    docker compose up -d --wait kafka eureka

                    # Explicit sanity check on the Kafka broker: the compose
                    # healthcheck may pass while the controller is still fencing,
                    # and the Kafka-consuming service tests need a usable broker.
                    docker compose exec -T kafka \\
                        /opt/kafka/bin/kafka-topics.sh \\
                        --bootstrap-server kafka:29092 --list >/dev/null
                '''
            }
        }

        stage('Tests') {
            when { expression { params.RUN_TESTS } }
            parallel {

                stage('Java services') {
                    agent {
                        docker {
                            // Jenkins runs agent containers as the host uid (123:125),
                            // where HOME=/ and Maven therefore tries to use /.m2.
                            // Run as root so the /root/.m2 cache volume below is writable.
                            image 'maven:3.9-eclipse-temurin-21'
                            args '''--network checkmems_chess-net
                                -e SPRING_PROFILES_ACTIVE=docker
                                -e DB_HOST=postgres
                                -e DB_USERNAME=imed
                                -e DB_PASSWORD=admin
                                -e SERVER_PORT=0
                                -e KAFKA_BOOTSTRAP_SERVERS=kafka:29092
                                -e EUREKA_CLIENT_SERVICEURL_DEFAULTZONE=http://eureka:8761/eureka/
                                -e OAUTH2_ISSUER_URI=http://keycloak:8080/realms/chess-platform
                                -e OAUTH2_JWK_SET_URI=http://keycloak:8080/realms/chess-platform/protocol/openid-connect/certs
                                -e KEYCLOAK_AUTH_SERVER_URL=http://keycloak:8080
                                -e KEYCLOAK_REALM=chess-platform
                                -e KEYCLOAK_RESOURCE=user-profile-service
                                -e KEYCLOAK_LOGIN_CLIENT_ID=chess-web
                                -e KEYCLOAK_ADMIN_CLIENT_ID=admin-cli
                                -e KEYCLOAK_ADMIN_USERNAME=admin
                                -e KEYCLOAK_ADMIN_PASSWORD=admin
                                -e KEYCLOAK_USER_PROFILE_CLIENT_SECRET=WYs5nX2LrnlaQPkH4Hmy4LWqNCYVaIWP
                                -e TEST_DB_URL=jdbc:postgresql://postgres:5432/chess_analysis-service
                                -e TEST_DB_USER=imed
                                -e TEST_DB_PASSWORD=admin
                                -u root
                                -v maven-cache:/root/.m2'''
                        }
                    }
                    steps {
                        script {
                            def databaseNames = [
                                'games-service': 'chess_game',
                                'user-profile-service': 'chess_user_profile',
                                'learning-service': 'chess_learning-service',
                                'move-analysis-service': 'chess_analysis-service'
                            ]
                            env.JAVA_SERVICE_NAMES.split(' ').each { svc ->
                                dir(svc) {
                                    echo "Unit tests: ${svc}"
                                    def testEnv = ["DB_NAME=${databaseNames.get(svc, '')}"]
                                    if (svc == 'games-service' || svc == 'user-profile-service') {
                                        // No Flyway migrations exist for these services, but
                                        // the docker profile uses ddl-auto=validate. Let
                                        // Hibernate create the schema for the CI database.
                                        testEnv.add('SPRING_JPA_HIBERNATE_DDL_AUTO=update')
                                    }
                                    withEnv(testEnv) {
                                        sh 'mvn -B test'
                                    }
                                }
                            }
                        }
                    }
                }

                stage('chess-web build') {
                    agent {
                        docker {
                            image 'node:20-alpine'
                            // Jenkins may run this container with HOME=/var/empty.
                            // Keep npm's cache in a writable container-local path
                            // instead of relying on the image's root-home path.
                            args '-e npm_config_cache=/tmp/npm-cache'
                        }
                    }
                    steps {
                        dir('chess-web') {
                            sh 'npm ci'
                            sh 'npx ng build --configuration production'
                        }
                    }
                }
            }
        }

        stage('Build images') {
            steps {
                // --pull keeps base images fresh; all images are tagged in docker-compose.yml.
                // keycloak is built from docker/keycloak/Dockerfile along with the rest.
                sh 'docker compose build --pull'
            }
        }

        stage('Check push configuration') {
            steps {
                script {
                    if (params.PUSH_IMAGES && !(params.DOCKER_REGISTRY ?: '').trim()) {
                        echo "PUSH_IMAGES is on but DOCKER_REGISTRY is empty - pushing to a registry is skipped."
                    }
                }
            }
        }

        stage('Push images') {
            // Skip gracefully: a push request without a registry is a no-op warning, not a failed build.
            when {
                allOf {
                    expression { params.PUSH_IMAGES }
                    expression { (params.DOCKER_REGISTRY ?: '').trim() }
                }
            }
            steps {
                script {
                    def registry = (params.DOCKER_REGISTRY ?: '').trim()
                    // docker login/logout want a bare host (docker.io, ghcr.io, ...):
                    // the "docker.io/<namespace>" form sets the Hub namespace but the auth host strips it.
                    def host = (registry.split('/'))[0]
                    def tag = "build-${env.BUILD_NUMBER}"
                    // Every service in docker-compose.yml is already tagged
                    // "${registry}/<name>:latest", so compose builds and pushes
                    // the exact images that live on the registry - no re-tagging.
                    def services = ['keycloak', 'eureka', 'gateway', 'games', 'profiles',
                                    'learning', 'analysis', 'events', 'web']
                    withCredentials([usernamePassword(
                            credentialsId: 'dockerhub-creds',
                            usernameVariable: 'REG_USER',
                            passwordVariable: 'REG_PASS')]) {
                        withEnv(["LOGIN_HOST=${host}"]) {
                            sh 'printf "%s\\n" "$REG_PASS" | docker login "$LOGIN_HOST" --username "$REG_USER" --password-stdin'
                            // Moving target on the registry, like the compose images:
                            // latest always points at the newest successful build.
                            sh "docker compose push ${services.join(' ')}"
                            // Immutable per-build tag on top of the push above.
                            services.each { svc ->
                                sh "docker tag ${registry}/${svc}:latest ${registry}/${svc}:${tag}"
                                sh "docker push ${registry}/${svc}:${tag}"
                            }
                            sh 'docker logout "$LOGIN_HOST"'
                        }
                    }
                }
            }
        }

        stage('Deploy (smoke run on this host)') {
            when { expression { params.DEPLOY_HOST } }
            steps {
                sh 'docker compose up -d --build'
                sh 'docker compose ps'
            }
        }
    }

    post {
        always {
            sh 'docker compose ps || true'
        }
        failure {
            sh 'docker compose logs --tail 100 > failure-logs.txt 2>&1 || true'
            archiveArtifacts artifacts: 'failure-logs.txt', allowEmptyArchive: true
        }
        unstable {
            sh 'docker compose ps || true'
        }
    }
}
