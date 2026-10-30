package imed.moveanalysisservice;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

/**
 * Full-context smoke test. It needs a real PostgreSQL instance with the Flyway schema, so it is
 * opt-in: run {@code mvn test -Danalysis.it.db=true} with TEST_DB_URL/TEST_DB_USER set.
 */
@SpringBootTest
@ActiveProfiles("test")
@Import(TestSecurityConfig.class)
@EnabledIfSystemProperty(named = "analysis.it.db", matches = "true")
class MoveAnalysisServiceApplicationTests {

    @Test
    void contextLoads() {
    }
}
