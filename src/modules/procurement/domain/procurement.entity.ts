import { Document, Types } from 'mongoose';

export interface ISupplier extends Document {
  _id: Types.ObjectId;
  name: string;
  contactPerson?: string;
  phone: string;
  totalOutstanding: number; // How much we owe them
  createdAt: Date;
}

export interface ISupplierPayment extends Document {
  _id: Types.ObjectId;
  supplierId: Types.ObjectId;
  amountPaid: number;
  paymentDate: Date;
  paymentMethod: 'cash' | 'bank_transfer' | 'cheque';
  note?: string;
}

export interface IReturnToSupplier extends Document {
  _id: Types.ObjectId;
  supplierId: Types.ObjectId;
  batchId: Types.ObjectId;
  medicineId: Types.ObjectId;
  quantityReturned: number;
  reason: 'expired' | 'damaged' | 'wrong_delivery';
  creditReceived: number; // Value deducted from our outstanding balance
  createdAt: Date;
}