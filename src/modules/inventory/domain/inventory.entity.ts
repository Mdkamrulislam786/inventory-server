import { Document, Types } from 'mongoose';

export interface IBatch extends Document {
  _id: Types.ObjectId;
  medicineId: Types.ObjectId;
  batchNumber: string;
  expiryDate: Date;
  quantity: number;      // Stored in Base Units (e.g., total tablets)
  purchasePrice: number; // Cost price per Base Unit (for profit calculation)
  mrp: number;           // Selling price per Base Unit
  supplierId?: Types.ObjectId;
  createdAt: Date;
}

export interface ITransaction extends Document {
  _id: Types.ObjectId;
  medicineId: Types.ObjectId;
  batchId: Types.ObjectId;
  userId: Types.ObjectId; // Who performed the action
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  totalPrice: number;     // quantity * mrp
  createdAt: Date;
}