# FSO — PHASE 5 SHIPMENT STATE MACHINE & PROVIDER MAPPING
**Flash Sales Online (FSO) — Logistics & Fulfillment State Machine**
**Date**: September 2026
**Persistence Target**: Neon PostgreSQL via Prisma ORM
**Authority Constraints**: Amended per Phase 5 Mandatory Directives (Zero Ambiguity, 1-to-1 Mapping, Centralized Aggregation)

---

## 1. Authoritative Status Enums in Prisma Schema

### `VendorOrderStatus` (Vendor Fulfillment Boundary)
```prisma
enum VendorOrderStatus {
  PENDING
  ACCEPTED
  PROCESSING
  READY_TO_SHIP
  SHIPPED
  DELIVERED
  CANCELLED
}
```

### `OrderStatus` (Customer Commercial Aggregate)
```prisma
enum OrderStatus {
  PENDING
  CONFIRMED
  PROCESSING
  DISPATCHED
  SHIPPED
  OUT_FOR_DELIVERY
  DELIVERED
  CANCELLED
  REFUNDED
  PARTIALLY_REFUNDED
}
```

### `PaymentStatus` (Razorpay Financial Authority — STRICTLY DECOUPLED)
```prisma
enum PaymentStatus {
  PENDING
  AUTHORIZED
  CAPTURED
  FAILED
  REFUNDED
  PARTIALLY_REFUNDED
}
```

> [!CRITICAL]
> **PAYMENT / LOGISTICS SEPARATION RULE**:
> Shiprocket state MUST NOT directly mutate `PaymentStatus`.
> Delivery, cancellation, RTO, or return events from Shiprocket NEVER update `PaymentStatus` directly.
> Only the payment/refund boundary (`paymentService.initiateRefund` + `RefundLog`) modifies financial payment state.

---

## 2. Deterministic 1-to-1 Provider Status Mapping Table
*(Per Amendment 9: Every normalized Shiprocket status maps deterministically to exactly one FSO behavior. No ambiguous or conditional multi-target mappings. If provider information is insufficient, retain current state and record the event).*

| Shiprocket Status | Normalized Provider Key | Deterministic FSO `VendorOrderStatus` Target | Action on Current FSO State |
|---|---|---|---|
| `NEW` / `ORDER GENERATED` | `NEW` | `PROCESSING` | Allowed only from `PENDING` or `ACCEPTED`; otherwise retain state. |
| `PICKUP SCHEDULED` / `AWB ASSIGNED` | `PICKUP_SCHEDULED` | `READY_TO_SHIP` | Transition to `READY_TO_SHIP`. |
| `PICKUP RESCHEDULED` | `PICKUP_RESCHEDULED` | `RETAIN_CURRENT_STATE` | No state transition. Record notice in log. |
| `PICKED UP` | `PICKED_UP` | `SHIPPED` | Transition to `SHIPPED`. Sets `shippedAt = now()`. |
| `IN TRANSIT` | `IN_TRANSIT` | `SHIPPED` | Transition to `SHIPPED` (or retain if already `SHIPPED`). |
| `OUT FOR DELIVERY` | `OUT_FOR_DELIVERY` | `SHIPPED` | Preserves `SHIPPED` in `VendorOrder`. |
| `DELIVERED` | `DELIVERED` | `DELIVERED` | Transition to `DELIVERED`. Sets `deliveredAt = now()`, `payoutStatus = "completed"`. Terminal state. |
| `CANCELED` / `CANCELLED` | `CANCELLED` | `CANCELLED` | Allowed ONLY if current status is pre-dispatch (`PENDING`, `ACCEPTED`, `PROCESSING`, `READY_TO_SHIP`). If already `SHIPPED` or `DELIVERED`, retain state and flag event. |
| `RTO INITIATED` / `RTO IN TRANSIT` | `RTO_IN_TRANSIT` | `RETAIN_CURRENT_STATE` | No state transition. Retain current state and record audit log. |
| `RTO DELIVERED` | `RTO_DELIVERED` | `RETAIN_CURRENT_STATE` | No state transition. Package back at vendor. Does NOT trigger automatic refund without business review. |
| `UNDELIVERED` | `UNDELIVERED` | `RETAIN_CURRENT_STATE` | Delivery re-attempt pending. Retain current state. |
| *Any Unknown / Unrecognized Status* | `UNKNOWN` | `RETAIN_CURRENT_STATE` | Retain current state. Record payload in `WebhookLog` with `status: "ignored"`. |

---

## 3. Monotonic State Transition Rules & Out-of-Order Matrix
*(Per Amendment 3 & 20: Out-of-order provider callbacks must not regress fulfillment state).*

```
[PENDING]
   │
   ▼ (Shipment creation initiated)
[ACCEPTED]
   │
   ▼ (Adhoc order generated in Shiprocket)
[PROCESSING]
   │
   ▼ (AWB assigned & Pickup scheduled)
[READY_TO_SHIP]
   │
   ▼ (Carrier picked up / In transit)
[SHIPPED]
   │
   ▼ (Customer delivered)
[DELIVERED] (TERMINAL STATE)
```

| Current FSO State | Incoming Provider Event | Deterministic Action | Reason |
|---|---|---|---|
| `DELIVERED` | `IN_TRANSIT` | **IGNORED / NO-OP** | Out-of-order event; terminal state `DELIVERED` is immutable. |
| `DELIVERED` | `PICKED_UP` | **IGNORED / NO-OP** | Out-of-order event. |
| `DELIVERED` | `CANCELLED` | **REJECTED / NO-OP** | Delivered shipment cannot be cancelled. |
| `SHIPPED` | `PROCESSING` / `NEW` | **IGNORED / NO-OP** | Out-of-order event. |
| `SHIPPED` | `CANCELLED` | **REJECTED / FLAGGED** | Shipped package in courier custody; cannot transition to `CANCELLED`. |
| `CANCELLED` | `PICKED_UP` / `IN_TRANSIT` | **BLOCKED / FLAGGED** | Anomalous courier event on cancelled shipment; alerts admin. |
| Any State | Identical Event ID | **IDEMPOTENT ACCEPT** | Already recorded in `WebhookLog`; return HTTP 200 without DB update. |

---

## 4. Centralized Parent Order Aggregation Precedence Table
*(Per Amendment 10: Single deterministic function `computeParentOrderStatus(vendorOrders)` applied consistently across all endpoints).*

```
Input: Array of sibling VendorOrders for an Order
Output: Exact target OrderStatus
```

| Precedence | Condition across Sibling VendorOrders | Deterministic Parent `OrderStatus` |
|:---:|---|:---:|
| **1** | `vendorOrders.length === 0` | Retain existing `order.status` |
| **2** | All `vendorOrders` have `status === "CANCELLED"` | `CANCELLED` |
| **3** | All `vendorOrders` have `status === "DELIVERED"` | `DELIVERED` |
| **4** | Any `vendorOrder` has `status === "DELIVERED"` (and remaining are `CANCELLED` or active) | If non-cancelled active orders exist and are `SHIPPED`, `SHIPPED`; if all non-cancelled are `DELIVERED`, `DELIVERED`. |
| **5** | Any `vendorOrder` has `status === "SHIPPED"` | `SHIPPED` |
| **6** | Any `vendorOrder` has `status === "READY_TO_SHIP"` | `PROCESSING` |
| **7** | Any `vendorOrder` has `status === "PROCESSING"` | `PROCESSING` |
| **8** | All active `vendorOrders` have `status === "ACCEPTED"` or `"PENDING"` | `CONFIRMED` |

**Financial Non-Interference**: Parent order status derivation NEVER mutates `Order.paymentStatus` or any `Payment` record.
