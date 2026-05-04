import { Document, Types } from 'mongoose';

export interface IBatch extends Document {
  _id: Types.ObjectId;
  medicineId: Types.ObjectId;
  batchNumber: string;
  expiryDate: Date;
  quantity: number; // Stored in Base Units (e.g., total tablets)
  purchasePrice: number; // Cost price per Base Unit (for profit calculation)
  mrp: number; // Selling price per Base Unit
  supplierId?: Types.ObjectId;
  createdAt: Date;
  companyMrp: number; // Printed on box (e.g., 50 TK)
  storePrice: number; // Admin's price (e.g., 40 TK)
  unitsPerPackage: number; // e.g., 10 tablets per strip
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

export interface StockInDTO {
  medicineId: string;
  supplierId?: string;
  batchNumber: string;
  expiryDate: Date;
  // Hierarchy Fields
  unitsReceived?: number; // e.g., 1 Big Carton
  boxesPerUnit?: number; // e.g., 20 boxes in that carton
  stripsPerBox?: number; // e.g., 10 strips in a box
  tabletsPerStrip?: number; // e.g., 10 tablets in a strip (or 1 for syrup)

  totalPurchasePrice: number; // The TOTAL money paid for this specific entry
  companyMrp: number; // Per smallest unit or per strip (usually per strip/bottle)
  storePrice: number; // Admin's selling price per smallest unit
}