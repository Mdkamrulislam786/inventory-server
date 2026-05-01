import { Schema, model } from 'mongoose';
import { ISupplier, ISupplierPayment, IReturnToSupplier } from '../domain/procurement.entity';

const supplierSchema = new Schema<ISupplier>({
  name: { type: String, required: true, unique: true },
  contactPerson: String,
  phone: { type: String, required: true },
  totalOutstanding: { type: Number, default: 0 }
}, { timestamps: true });

const supplierPaymentSchema = new Schema<ISupplierPayment>({
  supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true },
  amountPaid: { type: Number, required: true },
  paymentDate: { type: Date, default: Date.now },
  paymentMethod: { type: String, enum: ['cash', 'bank_transfer', 'cheque'], required: true },
  note: String
});

const returnSchema = new Schema<IReturnToSupplier>({
  supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true },
  batchId: { type: Schema.Types.ObjectId, ref: 'Batch', required: true },
  medicineId: { type: Schema.Types.ObjectId, ref: 'Medicine', required: true },
  quantityReturned: { type: Number, required: true },
  reason: { type: String, enum: ['expired', 'damaged', 'wrong_delivery'], required: true },
  creditReceived: { type: Number, required: true }
}, { timestamps: true });

export const SupplierModel = model<ISupplier>('Supplier', supplierSchema);
export const SupplierPaymentModel = model<ISupplierPayment>('SupplierPayment', supplierPaymentSchema);
export const ReturnModel = model<IReturnToSupplier>('Return', returnSchema);