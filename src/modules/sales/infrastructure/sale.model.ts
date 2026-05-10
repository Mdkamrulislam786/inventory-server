import { Schema, model } from 'mongoose';

const saleSchema = new Schema({
  employeeId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  customerName: { type: String, default: 'Walking Customer' },
  items: [{
    medicineId: { type: Schema.Types.ObjectId, ref: 'Medicine' },
    brandName: String,
    quantity: Number,
    soldPrice: Number, // The total price for the quantity
    isManualPrice: { type: Boolean, default: false }
  }],
  totalAmount: { type: Number, required: true },
  saleDate: { type: Date, default: Date.now }
}, { timestamps: true });

export const SaleModel = model('Sale', saleSchema);
