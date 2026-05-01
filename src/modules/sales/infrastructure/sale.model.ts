import { Schema, model } from 'mongoose';
import { ISale } from '../domain/sale.entity';

const saleSchema = new Schema<ISale>({
  items: [{
    medicineId: { type: Schema.Types.ObjectId, ref: 'Medicine', required: true },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    subtotal: { type: Number, required: true }
  }],
  totalAmount: { type: Number, required: true },
  discountTk: { type: Number, default: 0 },
  reason: { type: String },
  finalAmount: { type: Number, required: true },
  soldBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

export const SaleModel = model<ISale>('Sale', saleSchema);