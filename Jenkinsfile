// CheckMeMS CI/CD pipeline
//
// Requirements on the build agent (label 'docker'):
//   - Docker Engine + Compose v2 (`docker compose version` works)
//   - a credential with id 'docker-registry-login' when PUSH_IMAGES is enabled
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
        APP_IMAGE_PREFIX = 'checkmems'
    }

    parameters {
        booleanParam(name: 'RUN_TESTS', defaultValue: true,
            description: 'Run unit tests for the Java services and build the Angular app')
        booleanParam(name: 'PUSH_IMAGES', defaultValue: false,
            description: 'Push built images to DOCKER_REGISTRY (needs credential docker-registry-login)')
        string(name: 'DOCKER_REGISTRY', defaultValue: '',
            description: 'Registry path, e.g. ghcr.io/your-org or registry.example.com/checkmems')
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
                    # CI only needs Keycloak over the Compose network. Let Docker
                    # choose an ephemeral host port to avoid collisions on agents.
                    KEYCLOAK_HOST_PORT=0 docker compose up -d --wait \
                        postgres redis rabbitmq kafka eureka-server keycloak
                '''
            }
        }

        stage('Tests') {
            when { expression { params.RUN_TESTS } }
            parallel {

                stage('Java services') {
                    agent {
                        docker {
                            image 'maven:3.9-eclipse-temurin-21'
                            args '''--network checkmems_chess-net
                                -e SPRING_PROFILES_ACTIVE=docker
                                -e DB_HOST=postgres
                                -e DB_USERNAME=chess_user
                                -e DB_PASSWORD=chess_pass
                                -e SERVER_PORT=0
                                -e REDIS_HOST=redis
                                -e RABBITMQ_HOST=rabbitmq
                                -e RABBITMQ_USERNAME=chess_user
                                -e RABBITMQ_PASSWORD=chess_pass
                                -e KAFKA_BOOTSTRAP_SERVERS=kafka:29092
                                -e EUREKA_CLIENT_SERVICEURL_DEFAULTZONE=http://eureka-server:8761/eureka/
                                -e OAUTH2_ISSUER_URI=http://keycloak:8080/realms/chess-platform
                                -e OAUTH2_JWK_SET_URI=http://keycloak:8080/realms/chess-platform/protocol/openid-connect/certs
                                -e TEST_DB_URL=jdbc:postgresql://postgres:5432/chess_analysis-service
                                -e TEST_DB_USER=chess_user
                                -e TEST_DB_PASSWORD=chess_pass
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
                                    withEnv(["DB_NAME=${databaseNames.get(svc, '')}"]) {
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
                sh 'docker compose build --pull'
            }
        }

        stage('Push images') {
            when { expression { params.PUSH_IMAGES } }
            steps {
                script {
                    def registry = (params.DOCKER_REGISTRY ?: '').trim()
                    if (!registry) {
                        error 'PUSH_IMAGES requires DOCKER_REGISTRY'
                    }
                    def tag = "build-${env.BUILD_NUMBER}"
                    def images = ['eureka-server', 'api-gateway', 'games-service',
                                  'user-profile-service', 'learning-service',
                                  'move-analysis-service', 'kafka-service', 'chess-web']
                    withCredentials([usernamePassword(
                            credentialsId: 'docker-registry-login',
                            usernameVariable: 'REG_USER',
                            passwordVariable: 'REG_PASS')]) {
                        sh 'echo "$REG_PASS" | docker login ${DOCKER_REGISTRY} --username "$REG_USER" --password-stdin'
                        images.each { svc ->
                            sh "docker tag ${env.APP_IMAGE_PREFIX}/${svc}:latest ${registry}/${svc}:${tag}"
                            sh "docker push ${registry}/${svc}:${tag}"
                        }
                        sh 'docker logout ${DOCKER_REGISTRY}'
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
            sh 'docker compose stop postgres redis rabbitmq kafka eureka-server keycloak || true'
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
