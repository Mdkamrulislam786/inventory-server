import { Types } from 'mongoose';
import { MedicineModel, ShelfModel, ManufacturerModel } from '../infrastructure/catalog.model';
import { ApiError } from '../../../core/errors/api-error';
import { BaseUnit, IMedicine } from "../domain/catalog.entity";
import { BatchModel } from "../../inventory/infrastructure/inventory.model";

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

export const searchMedicines = async (searchTerm: string) => {
  // 1. Find Medicines (Scoped by tenantPlugin)
  const medicines = await MedicineModel.find({
    $or: [
      { brandName: { $regex: searchTerm, $options: "i" } },
      { genericName: { $regex: searchTerm, $options: "i" } },
    ],
  })
    .populate("shelfId")
    .populate("manufacturerId", "name")
    .lean();

  if (medicines.length === 0) return [];

  // Get all IDs to fetch batches in ONE query
  const medicineIds = medicines.map((m) => m._id);

  // 2. Fetch all valid batches for these medicines in ONE go
  const allBatches = await BatchModel.find({
    medicineId: { $in: medicineIds },
    quantity: { $gt: 0 },
    expiryDate: { $gt: new Date() },
  })
    .sort({ expiryDate: 1 })
    .lean();

  // 3. Map results (Process in memory, not in the DB)
  return medicines.map((med) => {
    // Find relevant batches for this specific medicine from our fetched list
    const medBatches = allBatches.filter(
      (b) => b.medicineId.toString() === med._id.toString(),
    );
    const latestBatch = medBatches[0]; // Since we sorted by expiryDate in the query, this is the earliest

    const totalStock = medBatches.reduce(
      (acc, b) => acc + (b.quantity || 0),
      0,
    );

    // Pricing logic
    let displayPrice = 0;
    let priceUnit = "";
    if (latestBatch) {
      if ([BaseUnit.TABLET, BaseUnit.CAPSULE].includes(med.baseUnit as any)) {
        displayPrice =
          latestBatch.storePrice * (latestBatch.unitsPerPackage || 1);
        priceUnit = "per strip";
      } else {
        displayPrice = latestBatch.storePrice;
        priceUnit = "per piece";
      }
    }

    return {
      id: med._id,
      brandName: med.brandName,
      genericName: med.genericName,
      baseUnit: med.baseUnit,
      manufacturer: med.manufacturerId,
      shelfLocation: med.shelfId
        ? {
            tag: (med.shelfId as any).shelfTag,
            description: (med.shelfId as any).description,
          }
        : "No shelf assigned",
      displayPrice,
      totalStock,
      priceUnit,
      batchInfo: latestBatch
        ? {
            batchNumber: latestBatch.batchNumber,
            expiryDate: latestBatch.expiryDate,
          }
        : null,
    };
  });
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
    shelfId: shelf._id,
  })
    .populate([
      { path: "manufacturerId", select: "name" },
      { path: "shelfId", select: "shelfTag description" },
    ])
    .lean();
};
