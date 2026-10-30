package imed.moveanalysisservice.exception;

import jakarta.validation.ConstraintViolationException;
import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(AnalysisNotFoundException.class)
    public ProblemDetail notFound(AnalysisNotFoundException exception) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, exception.getMessage());
    }

    @ExceptionHandler({ForbiddenException.class, AccessDeniedException.class})
    public ProblemDetail forbidden(RuntimeException exception) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.FORBIDDEN, exception.getMessage());
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ProblemDetail badRequest(IllegalArgumentException exception) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, exception.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail validation(MethodArgumentNotValidException exception) {
        ProblemDetail detail = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST,
                "Request validation failed");
        Map<String, String> errors = new LinkedHashMap<>();
        exception.getBindingResult().getFieldErrors()
                .forEach(error -> errors.putIfAbsent(error.getField(), error.getDefaultMessage()));
        detail.setProperty("errors", errors);
        return detail;
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ProblemDetail constraint(ConstraintViolationException exception) {
        ProblemDetail detail = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST,
                "Request validation failed");
        detail.setProperty("errors", exception.getMessage());
        return detail;
    }

    @ExceptionHandler(EngineUnavailableException.class)
    public ProblemDetail engineUnavailable(EngineUnavailableException exception) {
        ProblemDetail detail = ProblemDetail.forStatusAndDetail(HttpStatus.SERVICE_UNAVAILABLE,
                exception.getMessage());
        detail.setProperty("retryAfterSeconds", 5);
        return detail;
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ProblemDetail conflict(DataIntegrityViolationException exception) {
        log.warn("Data integrity conflict: {}", exception.getMostSpecificCause().getMessage());
        return ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT,
                "The request conflicts with the current analysis state");
    }

    @ExceptionHandler(Exception.class)
    public ProblemDetail unexpected(Exception exception) {
        log.error("Unhandled analysis error", exception);
        return ProblemDetail.forStatusAndDetail(HttpStatus.INTERNAL_SERVER_ERROR,
                "Unexpected analysis service error");
    }
}
