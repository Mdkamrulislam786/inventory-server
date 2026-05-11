import { Schema, model, Types } from 'mongoose';

const purchaseItemSchema = new Schema({
  medicineId: { type: Schema.Types.ObjectId, ref: 'Medicine', required: true },
  batchId: { type: Schema.Types.ObjectId, ref: 'Batch', required: true },
  
  // Hierarchy snapshots (useful for history even if batch math is done)
  unitsReceived: { type: Number, required: true },
  boxesPerUnit: { type: Number, default: 1 },
  stripsPerBox: { type: Number, default: 1 },
  tabletsPerStrip: { type: Number, default: 1 },
  
  totalPurchasePrice: { type: Number, required: true }, // Cost for this line item
  storePrice: { type: Number, required: true }         // Selling price set during purchase
});

const purchaseSchema = new Schema({
  supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true },
  invoiceNumber: { type: String }, // Supplier's physical invoice ID
  
  items: [purchaseItemSchema],
  
  totalAmount: { type: Number, required: true }, // Total bill for this purchase
  purchasedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  
  status: { 
    type: String, 
    enum: ['received', 'returned', 'cancelled'], 
    default: 'received' 
  },
  purchaseDate: { type: Date, default: Date.now }
}, { timestamps: true });

// Indexing for fast ledger lookups
purchaseSchema.index({ supplierId: 1, createdAt: -1 });

export const PurchaseModel = model('Purchase', purchaseSchema);