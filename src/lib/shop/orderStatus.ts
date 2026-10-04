/** Order status transitions offered in the admin UI. Mirrors orders_member_guard in 006_commerce.sql. */
export type OrderStatus = "pending" | "paid" | "fulfilled" | "cancelled" | "refunded";
export type ShopRole = "admin" | "owner" | "staff";

export const ORDER_STATUSES: OrderStatus[] = ["pending", "paid", "fulfilled", "cancelled", "refunded"];

export function allowedTransitions(
  order: { status: OrderStatus; paid_at: string | null },
  role: ShopRole,
): OrderStatus[] {
  let next: OrderStatus[] = [];
  switch (order.status) {
    case "pending":
      next = ["cancelled"];
      break;
    case "paid":
      next = ["fulfilled", "cancelled", "refunded"];
      break;
    case "fulfilled":
      next = ["refunded"];
      break;
    case "cancelled":
      next = order.paid_at ? ["refunded"] : [];
      break;
    default:
      next = [];
  }
  // The database allows only the shop owner (and Sulvatech admins) to mark refunded.
  return role === "staff" ? next.filter((s) => s !== "refunded") : next;
}

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Awaiting payment",
  paid: "Paid",
  fulfilled: "Fulfilled",
  cancelled: "Cancelled",
  refunded: "Refunded",
};
