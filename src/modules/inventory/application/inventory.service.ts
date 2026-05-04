import { Types, ClientSession } from "mongoose";
import {
  BatchModel,
  TransactionModel,
} from "../infrastructure/inventory.model";
import { ApiError } from "../../../core/errors/api-error";
import { MedicineModel } from "../../catalog/infrastructure/catalog.model";
import { SupplierModel } from "../../procurement/infrastructure/procurement.model";
import { StockInDTO } from "../domain/inventory.entity";
import { BaseUnit } from "../../catalog/domain/catalog.entity";

/**
 * Admin: Add new stock (Stock-In)
 */
export const stockIn = async (userId: string, data: StockInDTO) => {
  const medicine = await MedicineModel.findById(data.medicineId);
  if (!medicine) throw new ApiError(404, "Medicine not found");

  // 1. Hierarchy Math
  const units = data.unitsReceived || 1;
  const boxes = data.boxesPerUnit || 1;
  const strips = data.stripsPerBox || 1;
  const tabletsPerStrip = data.tabletsPerStrip || 1;

  const totalSmallestUnits = units * boxes * strips * tabletsPerStrip;

  // 2. Pricing Math
  const costPerSmallestUnit = data.totalPurchasePrice / totalSmallestUnits;

  let salePricePerSmallestUnit: number;
  // If it's a tablet/capsule, the admin enters price per STRIP
  if ([BaseUnit.TABLET, BaseUnit.CAPSULE].includes(medicine.baseUnit)) {
    salePricePerSmallestUnit = data.storePrice / tabletsPerStrip;
  } else {
    // If syrup/etc., admin enters price per BOTTLE
    salePricePerSmallestUnit = data.storePrice;
  }

  if (data.supplierId) {
    await SupplierModel.findByIdAndUpdate(data.supplierId, {
      $inc: { totalOutstanding: data.totalPurchasePrice },
    });
  }

  // 3. Create Batch
  const batch = await BatchModel.create({
    medicineId: medicine._id,
    batchNumber: data.batchNumber,
    expiryDate: data.expiryDate,
    quantity: totalSmallestUnits,
    purchasePrice: costPerSmallestUnit,
    storePrice: salePricePerSmallestUnit,
    unitsPerPackage: tabletsPerStrip, // Save this for search display logic!
    supplierId: data.supplierId,
  });

  // 5. Transaction Log
  await TransactionModel.create({
    medicineId: batch.medicineId,
    batchId: batch._id,
    userId: new Types.ObjectId(userId),
    type: "in",
    quantity: totalSmallestUnits,
    totalPrice: data.totalPurchasePrice, // Total bill
  });

  return batch;
   
};

/**
 * Employee: Sell Medicine (Stock-Out with FEFO)
 * Now accepts a 'session' for atomic transactions with the Sales module
 */
export const processSale = async (userId: string, medicineId: string, quantityRequested: number) => {
  // 1. Find all available batches for this medicine, sorted by earliest expiry (FEFO)
  const batches = await BatchModel.find({
    medicineId,
    quantity: { $gt: 0 },
    expiryDate: { $gt: new Date() }
  }).sort({ expiryDate: 1 });

  const totalAvailable = batches.reduce((acc, b) => acc + b.quantity, 0);
  if (totalAvailable < quantityRequested) {
    throw new ApiError(400, `Insufficient stock. Available: ${totalAvailable}`);
  }

  let remainingToDeduct = quantityRequested;
  const processedBatches = [];

  for (const batch of batches) {
    if (remainingToDeduct <= 0) break;

    const deduction = Math.min(batch.quantity, remainingToDeduct);
    
    // Update batch quantity
    batch.quantity -= deduction;
    await batch.save();

    // Log the transaction
    await TransactionModel.create({
      medicineId,
      batchId: batch._id,
      userId,
      type: 'out',
      quantity: deduction,
      totalPrice: deduction * batch.storePrice 
    });

    remainingToDeduct -= deduction;
    processedBatches.push({ batchNumber: batch.batchNumber, deducted: deduction });
  }

  return { message: "Sale processed successfully", processedBatches };
};

export const getMedicineStockStatus = async (medicineId: string) => {
  const batches = await BatchModel.find({ medicineId, quantity: { $gt: 0 } }).sort({ expiryDate: 1 });
  const totalQuantity = batches.reduce((acc, b) => acc + b.quantity, 0);
  return { totalQuantity, batches };
};
