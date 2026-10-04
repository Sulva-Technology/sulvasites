/** Public storefront data shapes shared by the loader, the routes and shop-capable templates. */

export type ShopImage = { url: string; alt: string };

export type ShopVariant = {
  id: string;
  options: Record<string, string>;
  /** null = use the product price. */
  priceKobo: number | null;
  /** null = untracked (always available). */
  stock: number | null;
  sku: string | null;
  position: number;
};

export type ShopProduct = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  images: ShopImage[];
  priceKobo: number;
  compareAtKobo: number | null;
  categoryId: string | null;
  featured: boolean;
  position: number;
  variants: ShopVariant[];
};

export type ShopCategory = { id: string; slug: string; name: string; position: number };

export type ShopSettings = {
  deliveryFeeKobo: number;
  pickupEnabled: boolean;
  pickupNote: string | null;
};

export type ShopData = {
  siteId: string;
  currency: "NGN";
  settings: ShopSettings;
  categories: ShopCategory[];
  products: ShopProduct[];
};

export type ShopView =
  | { kind: "list" }
  | { kind: "category"; slug: string }
  | { kind: "product"; slug: string }
  | { kind: "cart" }
  | { kind: "checkout" }
  | { kind: "order"; reference: string };

/** Payment states reported by GET /api/shop/[siteId]/orders/[reference]/verify. */
export type OrderPaymentState = "paid" | "pending" | "failed" | "cancelled" | "refund_pending";

export type OrderStatusItem = {
  name: string;
  variantLabel: string | null;
  unitKobo: number;
  quantity: number;
  lineTotalKobo: number;
};

export type OrderStatus = {
  reference: string;
  payment: OrderPaymentState;
  status: string;
  firstName: string;
  deliveryMethod: "delivery" | "pickup";
  subtotalKobo: number;
  deliveryKobo: number;
  totalKobo: number;
  items: OrderStatusItem[];
};
