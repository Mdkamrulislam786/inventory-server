import { Types, ClientSession } from "mongoose";
import {
  BatchModel,
  TransactionModel,
} from "../infrastructure/inventory.model";
import { ApiError } from "../../../core/errors/api-error";
import { MedicineModel } from "../../catalog/infrastructure/catalog.model";
import { SupplierModel } from "../../procurement/infrastructure/procurement.model";
import { StockInDTO } from "../domain/inventory.entity";

/**
 * Admin: Add new stock (Stock-In)
 */
export const stockIn = async (userId: string, data: StockInDTO) => {
  const medicine = await MedicineModel.findById(data.medicineId);
  if (!medicine) throw new ApiError(404, "Medicine not found in catalog");

  let finalBaseQuantity: number;
  const unitsPerStrip = medicine.packaging.unitsPerStrip || 1;
  const stripsPerBox = medicine.packaging.stripsPerBox || 1;
  const totalUnitsInBox = unitsPerStrip * stripsPerBox;

  // 1. Calculate Quantity
  if (data.manualTotalQuantity) {
    finalBaseQuantity = data.manualTotalQuantity;
  } else if (data.boxesReceived) {
    finalBaseQuantity = data.boxesReceived * totalUnitsInBox;
  } else {
    throw new ApiError(400, "Provide boxesReceived or manualTotalQuantity");
  }

  // 2. Financial Logic: costPerUnit
  // If manual, we assume purchasePrice is for the whole manual lot.
  // If boxes, it's price per box.
  const costPerUnit = data.manualTotalQuantity
    ? data.purchasePrice / data.manualTotalQuantity
    : data.purchasePrice / totalUnitsInBox;

  const totalInvoiceValue = data.manualTotalQuantity
    ? data.purchasePrice
    : data.purchasePrice * (data.boxesReceived || 0);

  // 3. Database Updates (Session recommended here for production)
  if (data.supplierId) {
    await SupplierModel.findByIdAndUpdate(data.supplierId, {
      $inc: { totalOutstanding: totalInvoiceValue },
    });
  }

  const batch = await BatchModel.create({
    medicineId: new Types.ObjectId(data.medicineId),
    batchNumber: data.batchNumber,
    expiryDate: data.expiryDate,
    quantity: finalBaseQuantity,
    purchasePrice: costPerUnit,
    companyMrp: data.companyMrp,
    storePrice: data.storePrice,
    supplierId: data.supplierId
      ? new Types.ObjectId(data.supplierId)
      : undefined, // Added this!
  });

  await TransactionModel.create({
    medicineId: batch.medicineId,
    batchId: batch._id,
    userId: new Types.ObjectId(userId),
    type: "in",
    quantity: finalBaseQuantity,
    totalPrice: totalInvoiceValue,
  });

  return batch;
};

/**
 * Employee: Sell Medicine (Stock-Out with FEFO)
 * Now accepts a 'session' for atomic transactions with the Sales module
 */
export const processSale = async (
  userId: string,
  medicineId: string,
  quantityToSell: number,
  session?: ClientSession, // Added for Atomicity
) => {
  // 1. Find active batches with session lock
  const batches = await BatchModel.find({
    medicineId: new Types.ObjectId(medicineId),
    quantity: { $gt: 0 },
    expiryDate: { $gt: new Date() },
  })
    .sort({ expiryDate: 1 })
    .session(session || null);

  const totalAvailable = batches.reduce((acc, b) => acc + b.quantity, 0);
  if (totalAvailable < quantityToSell) {
    throw new ApiError(400, `Insufficient stock. Available: ${totalAvailable}`);
  }

  let remainingToDeduct = quantityToSell;
  const saleLogs = [];

  for (const batch of batches) {
    if (remainingToDeduct <= 0) break;

    const deduction = Math.min(batch.quantity, remainingToDeduct);

    // Update batch quantity
    batch.quantity -= deduction;
    await batch.save({ session });

    // Record the store price used for this specific deduction
    saleLogs.push({
      batchId: batch._id,
      quantity: deduction,
      priceAtSale: batch.storePrice,
    });

    // Record transaction
    await TransactionModel.create(
      [
        {
          medicineId: batch.medicineId,
          batchId: batch._id,
          userId: new Types.ObjectId(userId),
          type: "out",
          quantity: deduction,
          totalPrice: deduction * batch.storePrice,
        },
      ],
      { session },
    );

    remainingToDeduct -= deduction;
  }

  return saleLogs; // Return logs so the Sales Service knows the total price
};
