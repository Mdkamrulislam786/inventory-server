import { Schema, model } from 'mongoose';
import { IBatch, ITransaction } from '../domain/inventory.entity';

const batchSchema = new Schema<IBatch>({
  medicineId: { type: Schema.Types.ObjectId, ref: 'Medicine', required: true },
  batchNumber: { type: String, required: true },
  expiryDate: { type: Date, required: true },
  quantity: { type: Number, required: true, min: 0 },
  purchasePrice: { type: Number, required: true }, // Pharmacy cost
  companyMrp: { type: Number, required: true },    // Printed price
  storePrice: { type: Number, required: true },     // Admin set price
  supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier' }
}, { timestamps: true });

// FEFO Index: Find medicine, then sort by expiry
batchSchema.index({ medicineId: 1, expiryDate: 1 });

const transactionSchema = new Schema<ITransaction>({
  medicineId: { type: Schema.Types.ObjectId, ref: 'Medicine', required: true },
  batchId: { type: Schema.Types.ObjectId, ref: 'Batch', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['in', 'out', 'adjustment'], required: true },
  quantity: { type: Number, required: true },
  totalPrice: { type: Number, required: true }
}, { timestamps: true });

export const BatchModel = model<IBatch>('Batch', batchSchema);
export const TransactionModel = model<ITransaction>('Transaction', transactionSchema);