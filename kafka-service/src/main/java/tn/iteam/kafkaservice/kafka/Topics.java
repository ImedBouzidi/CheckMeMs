package tn.iteam.kafkaservice.kafka;

/**
 * Canonical topic names for the platform.
 *
 * <p>Kept in this service so topic creation and consumption cannot drift from
 * each other. Producers in other services publish directly to these names.
 */
public final class Topics {

    public static final String USER_REGISTERED = "user-registered";
    public static final String CATEGORY_EVENTS = "category-events";
    public static final String PRODUCT_EVENTS = "product-events";
    public static final String ORDER_CREATED = "order-created";
    public static final String ORDER_CANCELLED = "order-cancelled";
    public static final String ORDER_APPROVED = "order-approved";
    public static final String PAYMENT_STATUS_UPDATED = "payment-status-updated";
    public static final String PAYMENT_REQUESTED = "payment.requested";
    public static final String PAYMENT_PAID = "payment.paid";
    public static final String PAYMENT_FAILED = "payment.failed";
    public static final String STOCK_RESERVE = "stock.reserve";
    public static final String STOCK_RESERVED = "stock.reserved";
    public static final String STOCK_RESERVATION_FAILED = "stock.reservation-failed";
    public static final String DLT_SUFFIX = ".DLT";

    private Topics() {
    }

    public static String deadLetter(String topic) {
        return topic + DLT_SUFFIX;
    }
}
