export interface CartItem {
  medicineId: string;
  quantity: number;
  manualPrice?: number; // Optional: only if employee overrides
}

export interface CheckoutPayload {
  customerName?: string;
  customerPhone?: string;
  cartItems: CartItem[];
}