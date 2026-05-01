import { Schema, model } from 'mongoose';
import { IManufacturer, IShelf, IMedicine } from '../domain/catalog.entity';

const manufacturerSchema = new Schema<IManufacturer>({
  name: { type: String, required: true, unique: true, trim: true },
  code: { type: String, required: true, unique: true, uppercase: true }
});

const shelfSchema = new Schema<IShelf>({
  shelfTag: { type: String, required: true, unique: true, uppercase: true },
  description: { type: String }
});

const medicineSchema = new Schema<IMedicine>({
  brandName: { type: String, required: true, index: true },
  genericName: { type: String, required: true, index: true },
  manufacturerId: { type: Schema.Types.ObjectId, ref: 'Manufacturer', required: true },
  shelfId: { type: Schema.Types.ObjectId, ref: 'Shelf', required: true },
  baseUnit: { type: String, required: true }, // e.g., 'tablet'
  packaging: {
    hasStrips: { type: Boolean, default: false },
    unitsPerStrip: { type: Number },
    stripsPerBox: { type: Number }
  },
  defaultStorePrice: { type: Number, required: true }
}, { timestamps: true });

// Fuzzy Search Index (Text Index)
medicineSchema.index({ brandName: 'text', genericName: 'text' });

export const ManufacturerModel = model<IManufacturer>('Manufacturer', manufacturerSchema);
export const ShelfModel = model<IShelf>('Shelf', shelfSchema);
export const MedicineModel = model<IMedicine>('Medicine', medicineSchema);