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
  // 1. Find Medicines and Populate Shelf Details
  const medicines = await MedicineModel.find({
    $or: [
      { brandName: { $regex: searchTerm, $options: "i" } },
      { genericName: { $regex: searchTerm, $options: "i" } },
    ],
  })
    .populate("shelfId") // Joins the Shelf collection
    .populate("manufacturerId", "name") // Optional: also grab Manufacturer name
    .lean();

  const results = [];

  for (const med of medicines) {
    // 2. Get the latest active batch for pricing
    const latestBatch = await BatchModel.findOne({
      medicineId: med._id,
      quantity: { $gt: 0 },
      expiryDate: { $gt: new Date() },
    }).sort({ expiryDate: 1 });

    let displayPrice = 0;
    let totalStock = 0;
    let priceUnit = "";

    if (latestBatch) {
      // 3. Context-Aware Pricing Logic
      if (
        [BaseUnit.TABLET, BaseUnit.CAPSULE].includes(med.baseUnit as BaseUnit)
      ) {
        displayPrice = latestBatch.storePrice * latestBatch.unitsPerPackage;
        priceUnit = "per strip";
      } else {
        displayPrice = latestBatch.storePrice;
        priceUnit = "per piece";
      }

      // 4. Aggregate Stock
      const allBatches = await BatchModel.find({
        medicineId: med._id,
        quantity: { $gt: 0 },
      });
      totalStock = allBatches.reduce((acc, b) => acc + b.quantity, 0);
    }

    // 5. Build Final Object with Shelf Details
    results.push({
      id: med._id,
      brandName: med.brandName,
      genericName: med.genericName,
      baseUnit: med.baseUnit,
      manufacturer: med.manufacturerId,
      // Added Shelf Details here
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
    });
  }

  return results;
};;

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
