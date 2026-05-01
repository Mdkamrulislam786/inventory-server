import { Document, Types } from 'mongoose';

export interface IManufacturer extends Document {
  _id: Types.ObjectId;
  name: string;
  code: string; // e.g., "SQ" for Square, "BX" for Beximco
}

export interface IShelf extends Document {
  _id: Types.ObjectId;
  shelfTag: string; // The physical OCR tag (e.g., "A-01")
  description?: string;
}

export interface IPackaging {
  hasStrips: boolean;      // True for tablets, False for Syrups/Injections
  unitsPerStrip?: number;  // Multiplier 1
  stripsPerBox?: number;   // Multiplier 2
}

export interface IMedicine extends Document {
  _id: Types.ObjectId;
  brandName: string;
  genericName: string;
  manufacturerId: Types.ObjectId;
  shelfId: Types.ObjectId;
  baseUnit: string;        // e.g., "tablet", "ml", "vial"
  packaging: IPackaging;
  createdAt: Date;
  updatedAt: Date;
}