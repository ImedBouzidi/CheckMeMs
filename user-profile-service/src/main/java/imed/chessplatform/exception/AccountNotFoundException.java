package imed.chessplatform.exception;

public class AccountNotFoundException extends RuntimeException {
    public AccountNotFoundException(String identifier) {
        super("No account found for: " + identifier);
    }
}
