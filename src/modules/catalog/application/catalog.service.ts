import { Types } from 'mongoose';
import { MedicineModel, ShelfModel, ManufacturerModel } from '../infrastructure/catalog.model';
import { ApiError } from '../../../core/errors/api-error';
import { IMedicine } from '../domain/catalog.entity';

export const createMedicine = async (data: Partial<IMedicine>) => {
  const existingMedicine = await MedicineModel.findOne({
    brandName: data.brandName,
    genericName: data.genericName,
  });
  if (existingMedicine) {
    throw new ApiError(
      409,
      `Medicine with brand name '${data.brandName}' and generic name '${data.genericName}' already exists`,
    );
  }
  return await MedicineModel.create(data);
};

export const createManufacturer = async (name: string, code: string) => {
  const existingManufacturer = await ManufacturerModel.findOne({
    name,
    code,
  });
  if (existingManufacturer) {
    throw new ApiError(
      409,
      `Manufacturer with name '${name}' and code '${code}' already exists`,
    );
  }
  return await ManufacturerModel.create({ name, code });
};

export const createShelf = async (shelfTag: string, description?: string) => {
  const existingShelf = await ShelfModel.findOne({
    shelfTag: shelfTag.toUpperCase(),
  });
  if (existingShelf) {
    throw new ApiError(409, `Shelf tag '${shelfTag}' already exists`);
  }
  return await ShelfModel.create({
    shelfTag: shelfTag.toUpperCase(),
    description,
  });
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
