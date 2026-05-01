import { Types } from 'mongoose';
import { MedicineModel, ShelfModel, ManufacturerModel } from '../infrastructure/catalog.model';
import { ApiError } from '../../../core/errors/api-error';
import { IMedicine } from '../domain/catalog.entity';

export const createMedicine = async (data: Partial<IMedicine>) => {
  return await MedicineModel.create(data);
};

export const createManufacturer = async (name: string, code: string) => {
  return await ManufacturerModel.create({ name, code });
};

export const createShelf = async (tag: string, description?: string) => {
  return await ShelfModel.create({ shelfTag: tag.toUpperCase(), description });
};

/**
 * Fuzzy Search Logic
 * Uses Regex for partial matching on Brand or Generic name
 */
export const searchMedicines = async (searchTerm: string) => {
  const regex = new RegExp(searchTerm, 'i');
  return await MedicineModel.find({
    $or: [
      { brandName: { $regex: regex } },
      { genericName: { $regex: regex } }
    ]
  })
  .populate('manufacturerId', 'name')
  .populate('shelfId', 'shelfTag')
  .limit(20)
  .lean();
};

/**
 * OCR Matching Logic
 * Filters the user's "Tray" (array of IDs) by a specific detected Shelf Tag
 */
export const matchTrayToShelf = async (shelfTag: string, trayMedicineIds: string[]) => {
  const shelf = await ShelfModel.findOne({ shelfTag: shelfTag.toUpperCase() });
  if (!shelf) throw new ApiError(404, 'Shelf not found');

  const medicineObjectIds = trayMedicineIds.map(id => new Types.ObjectId(id));

  return await MedicineModel.find({
    _id: { $in: medicineObjectIds },
    shelfId: shelf._id
  })
  .populate('manufacturerId', 'name')
  .lean();
};