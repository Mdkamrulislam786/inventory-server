import { Document, Types } from 'mongoose';

export interface ISaleItem {
  medicineId: Types.ObjectId;
  quantity: number;
  unitPrice: number; // storePrice used
  subtotal: number;
}

export interface ISale extends Document {
  items: ISaleItem[];
  totalAmount: number;
  discountTk: number;   // Absolute TK
  reason?: string;      // Optional
  finalAmount: number;
  soldBy: Types.ObjectId;
  createdAt: Date;
}