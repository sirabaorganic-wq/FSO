const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const prisma = require("../config/prisma");
const { invalidateCache } = require("../config/cache");

/**
 * Deterministic 1-to-1 Shiprocket Status to FSO VendorOrderStatus Mapping
 * Strictly adheres to Amendment 9 & FSO_PHASE_5_SHIPMENT_STATE_MACHINE.md
 */
const mapShiprocketStatus = (srStatus) => {
  if (!srStatus) return null;
  const s = String(srStatus).trim().toUpperCase();

  if (s === "NEW" || s === "ORDER GENERATED") return "PROCESSING";
  if (s === "PICKUP SCHEDULED" || s === "AWB ASSIGNED") return "READY_TO_SHIP";
  if (s === "PICKED UP") return "SHIPPED";
  if (s === "IN TRANSIT") return "SHIPPED";
  if (s === "OUT FOR DELIVERY") return "SHIPPED";
  if (s === "DELIVERED") return "DELIVERED";
  if (s === "CANCELED" || s === "CANCELLED") return "CANCELLED";

  // RTO, Rescheduled, Undelivered, or unknown events retain current state
  return null;
};

/**
 * Centralized Parent Order Status Aggregation Precedence
 * Strictly adheres to Amendment 10
 */
function computeParentOrderStatus(vendorOrders, currentOrderStatus) {
  if (!vendorOrders || vendorOrders.length === 0) return currentOrderStatus;

  const statuses = vendorOrders.map((vo) => vo.status);

  // Precedence 2: All cancelled
  if (statuses.every((s) => s === "CANCELLED")) return "CANCELLED";

  // Precedence 3: All delivered
  if (statuses.every((s) => s === "DELIVERED")) return "DELIVERED";

  // If some are cancelled and all remaining active are delivered -> DELIVERED
  const activeStatuses = statuses.filter((s) => s !== "CANCELLED");
  if (activeStatuses.length > 0 && activeStatuses.every((s) => s === "DELIVERED")) {
    return "DELIVERED";
  }

  // Precedence 5: Any active is shipped (or delivered)
  if (activeStatuses.some((s) => s === "SHIPPED" || s === "DELIVERED")) return "SHIPPED";

  // Precedence 6 & 7: Any active is ready to ship or processing
  if (activeStatuses.some((s) => s === "READY_TO_SHIP" || s === "PROCESSING")) return "PROCESSING";

  // Precedence 8: All remaining active are accepted or pending
  return "CONFIRMED";
}

// @desc    Shiprocket Fulfillment Status Webhook Endpoint
// @route   POST /api/fulfillment/status and /api/shiprocket/webhook
// @access  Protected by Webhook Secret (Fail-closed per Amendment 4)
router.post("/", async (req, res) => {
  try {
    const expectedSecret = process.env.SHIPROCKET_WEBHOOK_SECRET;

    // Fail closed per Amendment 4: missing secret rejects in production
    if (!expectedSecret) {
      console.warn("Shiprocket Webhook rejected: SHIPROCKET_WEBHOOK_SECRET is not configured on the server");
      return res.status(401).json({ message: "Webhook secret not configured" });
    }

    const incomingToken =
      req.headers["x-api-key"] ||
      req.headers["x-shiprocket-secret"] ||
      req.headers["x-shiprocket-token"] ||
      req.headers["shiprocket-secret"];

    if (!incomingToken || incomingToken !== expectedSecret) {
      console.warn("Shiprocket Webhook rejected: Invalid secret token");
      return res.status(401).json({ message: "Invalid webhook secret" });
    }

    const payload = req.body || {};
    const { order_id, shipment_id, awb, courier_name } = payload;
    const currentStatus = payload.current_status || payload.shipment_status || "";
    const statusId = payload.current_status_id || payload.shipment_status_id || "";

    // Derive collision-safe event identity (Amendment 3 & Correction 2)
    let eventId;
    if (payload.id || payload.event_id) {
      // Authoritative provider event ID
      eventId = `sr_wh_${payload.id || payload.event_id}`.replace(/[^a-zA-Z0-9_.-]/g, "_");
    } else {
      // Deterministic fingerprint derived from immutable event fields
      const immutableHash = crypto
        .createHash("sha256")
        .update(
          JSON.stringify({
            awb: awb || shipment_id || "",
            status: currentStatus,
            status_id: statusId,
            location: payload.location || payload.current_location || "",
            activity: payload.activity || payload.scan_type || "",
            scan_time: payload.status_date_time || payload.scan_date_time || payload.current_timestamp || "",
          })
        )
        .digest("hex")
        .substring(0, 16);

      const rawId = `${shipment_id || awb || order_id || "evt"}_${statusId || currentStatus || "update"}_${immutableHash}`;
      eventId = `sr_wh_${rawId}`.replace(/[^a-zA-Z0-9_.-]/g, "_");
    }

    // Idempotency check with PostgreSQL WebhookLog (Gate 5)
    try {
      await prisma.webhookLog.create({
        data: {
          eventId,
          provider: "shiprocket",
          eventType: currentStatus ? String(currentStatus) : "shipment_update",
          status: "processed",
          payload,
        },
      });
    } catch (dupErr) {
      // Duplicate event delivery: return HTTP 200 with zero state mutation
      return res.status(200).json({ success: true, message: "Event already processed" });
    }

    if (!order_id && !awb && !shipment_id) {
      return res.status(200).json({ message: "Payload missing identifier, logged" });
    }

    // Locate VendorOrder in PostgreSQL
    const vendorOrder = await prisma.vendorOrder.findFirst({
      where: {
        OR: [
          ...(shipment_id ? [{ shipmentId: String(shipment_id) }] : []),
          ...(awb ? [{ awbCode: String(awb) }] : []),
          ...(order_id ? [{ id: String(order_id) }, { shiprocketOrderId: String(order_id) }, { vendorOrderNumber: String(order_id) }] : []),
        ],
      },
    });

    if (!vendorOrder) {
      return res.status(200).json({ message: "VendorOrder not found, logged" });
    }

    const targetStatus = mapShiprocketStatus(currentStatus);

    // Monotonic state transition enforcement: prevent out-of-order state regression
    const currentFSOStatus = vendorOrder.status;

    let shouldUpdateStatus = false;
    if (targetStatus) {
      if (currentFSOStatus === "DELIVERED") {
        // Terminal state: ignore any regression
        shouldUpdateStatus = false;
      } else if (currentFSOStatus === "SHIPPED") {
        // Can only transition forward to DELIVERED; ignore regression to PROCESSING/READY_TO_SHIP/CANCELLED
        if (targetStatus === "DELIVERED") {
          shouldUpdateStatus = true;
        }
      } else if (currentFSOStatus === "CANCELLED") {
        // Cancelled orders cannot be moved to active shipment states via webhook
        shouldUpdateStatus = false;
      } else {
        // PENDING, ACCEPTED, PROCESSING, READY_TO_SHIP can progress forward
        shouldUpdateStatus = true;
      }
    }

    const updateData = {
      awbCode: awb ? String(awb) : vendorOrder.awbCode,
      courierName: courier_name ? String(courier_name) : vendorOrder.courierName,
    };

    if (shouldUpdateStatus && targetStatus) {
      updateData.status = targetStatus;
      if (targetStatus === "DELIVERED" && !vendorOrder.deliveredAt) {
        updateData.deliveredAt = new Date();
        updateData.payoutStatus = "completed";
      }
      if (targetStatus === "SHIPPED" && !vendorOrder.shippedAt) {
        updateData.shippedAt = new Date();
      }
    }

    await prisma.vendorOrder.update({
      where: { id: vendorOrder.id },
      data: updateData,
    });

    // Centralized Parent Order Status Aggregation (Amendment 10)
    const parentOrder = await prisma.order.findUnique({
      where: { id: vendorOrder.orderId },
      include: { vendorOrders: true },
    });

    if (parentOrder) {
      const targetParentStatus = computeParentOrderStatus(parentOrder.vendorOrders, parentOrder.status);
      const parentUpdateData = {};

      if (targetParentStatus !== parentOrder.status) {
        parentUpdateData.status = targetParentStatus;
        if (targetParentStatus === "DELIVERED" && !parentOrder.deliveredAt) {
          parentUpdateData.deliveredAt = new Date();
          parentUpdateData.isDelivered = true;
        }
        if (targetParentStatus === "CANCELLED" && !parentOrder.cancelledAt) {
          parentUpdateData.cancelledAt = new Date();
        }

        // CRITICAL: Under NO circumstances mutate PaymentStatus
        await prisma.order.update({
          where: { id: parentOrder.id },
          data: parentUpdateData,
        });
      }
    }

    if (invalidateCache?.orders) invalidateCache.orders();

    res.status(200).json({ success: true, message: "Webhook processed successfully" });
  } catch (error) {
    console.error("Shiprocket webhook error:", error);
    res.status(500).json({ message: "Internal Error" });
  }
});

module.exports = router;
module.exports.mapShiprocketStatus = mapShiprocketStatus;
module.exports.computeParentOrderStatus = computeParentOrderStatus;
