export type StaffRole = "ADMIN" | "CASHIER";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: StaffRole;
  locationId: string;
}

export type StationType = "PLAYSTATION" | "TABLE_GAME" | "SKATING" | "OTHER";
export type DisplayStatus = "FREE" | "ACTIVE" | "PAUSED" | "EXPIRING_SOON" | "OVERDUE" | "MAINTENANCE";
export type SessionStatus = "ACTIVE" | "PAUSED" | "ENDED";

export interface LiveSession {
  id: string;
  playerName: string | null;
  packageLabel: string;
  ratePerHour: number;
  status: SessionStatus;
  startedAt: string;
  plannedEndAt: string | null;
  durationMin: number | null;
  extensionsMin: number;
  elapsedMs: number;
  remainingMs: number | null;
}

export interface StationSnapshot {
  id: string;
  name: string;
  type: StationType;
  allowMultipleSessions: boolean;
  sessions: LiveSession[];
}

export interface SessionsSnapshot {
  stations: StationSnapshot[];
  stats: {
    activeNow: number;
    expiringSoon: number;
    sessionsToday: number;
    revenueToday: number;
  };
}

export interface SessionHistoryRow {
  id: string;
  stationName: string;
  playerName: string | null;
  packageLabel: string;
  startedAt: string;
  endedAt: string | null;
  status: SessionStatus | "TRANSFERRED";
  transferredToStation: string | null;
  finalAmount: number | null;
}

/** A category is a row the admin manages, not a fixed set of values. */
export interface ProductCategory {
  id: string;
  name: string;
  /** Hex, so the category looks the same in every chart, bar and badge. */
  color: string;
  sortOrder: number;
  active: boolean;
  /** Products in the catalogue, i.e. not deleted. */
  productCount?: number;
  /** Deleted products still attached to it — invisible, but they block deletion. */
  hiddenCount?: number;
}

export type ProductType = "ITEM" | "TIME_PACKAGE";

export interface Product {
  id: string;
  name: string;
  categoryId: string;
  category: ProductCategory;
  type: ProductType;
  price: number;
  imageUrl: string | null;
  inStock: boolean;
  stockQty: number | null;
  durationMin: number | null;
  stationTypeLink: StationType | null;
}

export type OrderType = "DINE" | "WALK" | "DELIVERY";
export type OrderStatus = "OPEN" | "HELD" | "COMPLETED" | "CANCELLED";
export type PaymentMethod = "CASH" | "CARD" | "MOBILE" | "CREDIT";

export interface OrderItem {
  id: string;
  productId: string;
  product: Product;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface Order {
  id: string;
  orderNumber: number;
  type: OrderType;
  status: OrderStatus;
  customerId: string | null;
  customer: Customer | null;
  waiterId: string | null;
  waiter: { id: string; name: string } | null;
  createdBy: { id: string; name: string } | null;
  discountId: string | null;
  discount: Discount | null;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  paymentMethod: PaymentMethod | null;
  items: OrderItem[];
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  balance: number;
  visitCount: number;
  notes: string | null;
}

export type DiscountType = "PERCENT" | "FLAT";

export interface Discount {
  id: string;
  name: string;
  type: DiscountType;
  value: number;
  active: boolean;
  startsAt: string | null;
  endsAt: string | null;
  productId: string | null;
}

export interface Expense {
  id: string;
  category: string;
  amount: number;
  note: string | null;
  date: string;
  createdBy?: { name: string } | null;
}

export interface Station {
  id: string;
  name: string;
  type: StationType;
  active: boolean;
  sortOrder: number;
}

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
}
