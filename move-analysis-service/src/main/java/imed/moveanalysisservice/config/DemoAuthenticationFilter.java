package imed.moveanalysisservice.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import java.util.regex.Pattern;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Gives every request a synthetic principal in the `demo` profile.
 *
 * <p>Analysis ownership is derived from {@code Authentication.getName()}, and
 * live analysis rejects anonymous callers. The frontend sends a browser-stable
 * {@code X-Demo-User} id so each visitor owns their own reviews.</p>
 */
final class DemoAuthenticationFilter extends OncePerRequestFilter {

    private static final String DEMO_USER_HEADER = "X-Demo-User";
    private static final String FALLBACK_USER = "demo";
    private static final Pattern SAFE_ID = Pattern.compile("[A-Za-z0-9_-]{1,64}");

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String demoUser = request.getHeader(DEMO_USER_HEADER);
        if (demoUser == null || !SAFE_ID.matcher(demoUser).matches()) {
            demoUser = FALLBACK_USER;
        }

        UsernamePasswordAuthenticationToken authentication =
                new UsernamePasswordAuthenticationToken(
                        demoUser,
                        null,
                        List.of(new SimpleGrantedAuthority("ROLE_DEMO")));
        SecurityContextHolder.getContext().setAuthentication(authentication);

        try {
            filterChain.doFilter(request, response);
        } finally {
            SecurityContextHolder.clearContext();
        }
    }
}
