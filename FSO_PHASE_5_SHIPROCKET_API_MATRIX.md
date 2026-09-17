
  - **Vendor input amount is NON-AUTHORITATIVE**.
  - Authoritative refundable amount is calculated server-side from `VendorOrder.subtotal + VendorOrder.taxAmount` (or item refund calculation).
  - Verifies cumulative refunded amount on parent `Order` / `Payment` cannot exceed paid amount.
  - Invokes `paymentService.initiateRefund` and persists `RefundLog`.

---

## 4. Cancellation & Refund Orchestration

### 4.1 Order Cancellation Consistency (Amendment 11)
- **`POST /api/orders/:id/cancel`**: Private / Customer.
  - Verifies `order.userId === req.user.id`.
  - Rejects if `order.status` is `SHIPPED`, `DELIVERED`, or `CANCELLED`.
  - Reverts inventory stock atomically.
  - For each `VendorOrder` with an assigned `awbCode` in pre-dispatch status (`PROCESSING`, `READY_TO_SHIP`):
    - Invokes `shiprocketService.cancelShipment(awbCode)`.
    - If Shiprocket API times out or fails: FSO cancellation still succeeds; an explicit reconciliation alert (`Notification.create`) is recorded for admin logistics resolution.
  - If order was prepaid (`paymentStatus === "CAPTURED"`):
    - Invokes `paymentService.initiateRefund` with idempotency receipt.
    - Records `RefundLog`.

### 4.2 Refund Idempotency & Limits (Amendment 6)
- Before initiating any Razorpay refund:
  - Fetches existing `RefundLog` records for `paymentId`.
  - Sums cumulative refunded amount: `sum(refundLogs.amount)`.
  - Verifies: `cumulativeRefunded + requestedRefund <= payment.amount`.
  - Passes deterministic `receipt: "ref_" + orderId + "_" + vendorOrderId` to Razorpay `payments.refund`.
  - Re-attempting refund with same receipt returns existing refund without duplicate debit.
