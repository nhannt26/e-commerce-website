// For now, we'll log emails to console
// In production, use nodemailer or SendGrid

class EmailService {
  static async sendOrderConfirmation(order, user) {
    console.log("📧 ORDER CONFIRMATION EMAIL");
    console.log("To:", user.email);
    console.log("Order Number:", order.orderNumber);
    console.log("Total:", `$${order.pricing.total}`);
    console.log("Items:", order.items.length);
    console.log("Status:", order.orderStatus);
    console.log("---");

    // In production:
    // await sendEmail({
    //     to: user.email,
    //     subject: `Order Confirmation - ${order.orderNumber}`,
    //     template: 'order-confirmation',
    //     data: { order, user }
    // });

    return true;
  }

  static async sendOrderStatusUpdate(order, user, oldStatus, newStatus) {
    console.log("📧 ORDER STATUS UPDATE EMAIL");
    console.log("To:", user.email);
    console.log("Order Number:", order.orderNumber);
    console.log("Status Changed:", `${oldStatus} → ${newStatus}`);
    console.log("---");

    return true;
  }

  static async sendOrderShipped(order, user) {
    console.log("📧 ORDER SHIPPED EMAIL");
    console.log("To:", user.email);
    console.log("Order Number:", order.orderNumber);
    console.log("Tracking Number:", order.trackingNumber);
    console.log("Carrier:", order.carrier);
    console.log("Estimated Delivery:", order.estimatedDelivery);
    console.log("---");

    return true;
  }

  static async sendOrderDelivered(order, user) {
    console.log("📧 ORDER DELIVERED EMAIL");
    console.log("To:", user.email);
    console.log("Order Number:", order.orderNumber);
    console.log("Delivered At:", order.deliveredAt);
    console.log("---");

    return true;
  }

  static async sendOrderCancelled(order, user) {
    console.log("📧 ORDER CANCELLED EMAIL");
    console.log("To:", user.email);
    console.log("Order Number:", order.orderNumber);
    console.log("Reason:", order.cancelReason);
    console.log("---");

    return true;
  }
  
  // Payment confirmation
  static async sendPaymentConfirmation(order, user, transaction) {
    console.log("📧 PAYMENT CONFIRMATION EMAIL");
    console.log("To:", user.email);
    console.log("Order:", order.orderNumber);
    console.log("Amount:", `${transaction.amount} VND`);
    console.log("Transaction:", transaction.transactionId);
    console.log("Payment Method:", transaction.paymentMethod);
    console.log("---");
    return true;
  }

  // Payment failed
  static async sendPaymentFailed(order, user, errorMessage) {
    console.log("📧 PAYMENT FAILED EMAIL");
    console.log("To:", user.email);
    console.log("Order:", order.orderNumber);
    console.log("Error:", errorMessage);
    console.log("---");
    return true;
  }

  // Refund processed
  static async sendRefundConfirmation(order, user, transaction) {
    console.log("📧 REFUND CONFIRMATION EMAIL");
    console.log("To:", user.email);
    console.log("Order:", order.orderNumber);
    console.log("Refund Amount:", `${transaction.refundAmount} VND`);
    console.log("Reason:", transaction.refundReason);
    console.log("---");
    return true;
  }
}

module.exports = EmailService;
