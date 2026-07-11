import { Types, PipelineStage } from "mongoose";
import {
  BatchModel,
  TransactionModel,
} from "../infrastructure/inventory.model";
import { ApiError } from "../../../core/errors/api-error";
import { MedicineModel } from "../../catalog/infrastructure/catalog.model";
import { SupplierModel } from "../../procurement/infrastructure/procurement.model";
import { StockInDTO } from "../domain/inventory.entity";
import { BaseUnit } from "../../catalog/domain/catalog.entity";
import {
  StockListQuery,
  StockListResponse,
  PaginatedResult,
} from "../domain/inventory.entity";
import mongoose from "mongoose";

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

  let batch = await BatchModel.findOne({
    medicineId: medicine._id,
    batchNumber: data.batchNumber,
  });

  if (batch) {
    // UPDATE EXISTING: Increment quantity and update to latest pricing
    batch.quantity += totalSmallestUnits;
    batch.purchasePrice = costPerSmallestUnit;
    batch.storePrice = salePricePerSmallestUnit;
    batch.expiryDate = data.expiryDate; // Just in case the date was entered wrong before
    await batch.save();
  } else {
    // 3. Create Batch
    batch = await BatchModel.create({
      medicineId: medicine._id,
      batchNumber: data.batchNumber,
      expiryDate: data.expiryDate,
      quantity: totalSmallestUnits,
      purchasePrice: costPerSmallestUnit,
      storePrice: salePricePerSmallestUnit,
      unitsPerPackage: tabletsPerStrip, // Save this for search display logic!
      supplierId: data.supplierId,
    });
  }

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
export const processSale = async (
  userId: string,
  medicineId: string,
  quantityRequested: number,
) => {
  // 1. Find all available batches for this medicine, sorted by earliest expiry (FEFO)
  const batches = await BatchModel.find({
    medicineId,
    quantity: { $gt: 0 },
    expiryDate: { $gt: new Date() },
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
      type: "out",
      quantity: deduction,
      totalPrice: deduction * batch.storePrice,
    });

    remainingToDeduct -= deduction;
    processedBatches.push({
      batchNumber: batch.batchNumber,
      deducted: deduction,
    });
  }

  return { message: "Sale processed successfully", processedBatches };
};

export const getMedicineStockStatus = async (medicineId: string) => {
  const batches = await BatchModel.find({
    medicineId,
    quantity: { $gt: 0 },
  }).sort({ expiryDate: 1 });
  const totalQuantity = batches.reduce((acc, b) => acc + b.quantity, 0);
  return { totalQuantity, batches };
};

export const getPaginatedStockList = async (
  query: StockListQuery,
): Promise<PaginatedResult<StockListResponse>> => {
  const page = query.page || 1;
  const limit = query.limit || 10;
  const skip = (page - 1) * limit;
  const search = query.search || "";

  const pipeline: PipelineStage[] = [
    // 1. Filter by search
    {
      $match: {
        $or: [
          { brandName: { $regex: search, $options: "i" } },
          { genericName: { $regex: search, $options: "i" } },
        ],
      },
    },
    // 2. Join with Shelves
    {
      $lookup: {
        from: "shelves",
        localField: "shelfId",
        foreignField: "_id",
        as: "shelfInfo",
      },
    },
    { $unwind: { path: "$shelfInfo", preserveNullAndEmptyArrays: true } },
    // 3. Join with active batches (FEFO)
    {
      $lookup: {
        from: "batches",
        let: { medId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$medicineId", "$$medId"] },
              quantity: { $gt: 0 },
              expiryDate: { $gt: new Date() },
            },
          },
          { $sort: { expiryDate: 1 } },
        ],
        as: "inventory",
      },
    },
    // 4. Shape the response to match StockListResponse
    {
      $project: {
        id: "$_id",
        brandName: 1,
        genericName: 1,
        baseUnit: 1,
        shelf: {
          tag: { $ifNull: ["$shelfInfo.shelfTag", "N/A"] },
          location: { $ifNull: ["$shelfInfo.description", "Unassigned"] },
        },
        totalStock: { $sum: "$inventory.quantity" },
        firstBatch: { $arrayElemAt: ["$inventory", 0] },
        activeBatches: "$inventory.batchNumber",
      },
    },
    {
      $addFields: {
        displayPrice: {
          $cond: {
            if: { $in: ["$baseUnit", [BaseUnit.TABLET, BaseUnit.CAPSULE]] },
            then: {
              $multiply: [
                { $ifNull: ["$firstBatch.storePrice", 0] },
                { $ifNull: ["$firstBatch.unitsPerPackage", 1] },
              ],
            },
            else: { $ifNull: ["$firstBatch.storePrice", 0] },
          },
        },
        priceUnit: {
          $cond: {
            if: { $in: ["$baseUnit", [BaseUnit.TABLET, BaseUnit.CAPSULE]] },
            then: "per strip",
            else: "per piece",
          },
        },
      },
    },
    { $project: { firstBatch: 0 } },
    // 5. Paginate using Facet
    {
      $facet: {
        metadata: [{ $count: "total" }],
        data: [{ $skip: skip }, { $limit: limit }],
      },
    },
  ];

  const aggregateResult = await MedicineModel.aggregate(pipeline);

  // Extract data from Facet result
  const docs: StockListResponse[] = aggregateResult[0].data;
  const totalDocs = aggregateResult[0].metadata[0]?.total || 0;

  return {
    data: docs,
    total: totalDocs,
    limit,
    page,
    totalPages: Math.ceil(totalDocs / limit),
  };
};

export const deductStockFEFO = async (
  medicineId: string,
  requestedQty: number,
  saleId: string,
  userId: string,
  manualPrice: number | undefined,
  session: mongoose.ClientSession, // MUST pass the session
) => {
  // 1. Fetch Medicine
  const medicine = await MedicineModel.findById(medicineId).session(session);
  if (!medicine) throw new Error("Medicine not found");

  // 2. Fetch Batches (FEFO: Sort by expiry)
  // The tenantPlugin handles scoping automatically via the context
  const batches = await BatchModel.find(
    {
      medicineId,
      quantity: { $gt: 0 },
      expiryDate: { $gt: new Date() },
    },
    null,
    { session },
  ).sort({ expiryDate: 1 });

  // 3. Validate Stock
  const available = batches.reduce((acc, b) => acc + b.quantity, 0);
  if (available < requestedQty) {
    throw new Error(
      `Insufficient stock for: ${medicine.brandName}. Available: ${available}`,
    );
  }

  let remaining = requestedQty;
  let systemTotalPrice = 0;

  // 4. Process Batches
  for (const batch of batches) {
    if (remaining <= 0) break;

    const take = Math.min(batch.quantity, remaining);

    // ATOMIC UPDATE: This prevents race conditions where 2 people buy the same item
    await BatchModel.findByIdAndUpdate(
      batch._id,
      { $inc: { quantity: -take } },
      { session, new: true },
    );

    // Calculate Price for this specific movement
    // If manualPrice exists, distribute proportionally
    const batchCalculatedPrice = manualPrice
      ? manualPrice * (take / requestedQty)
      : take * batch.storePrice;

    systemTotalPrice += take * batch.storePrice;

    // Create Transaction Record
    await TransactionModel.create(
      [
        {
          saleId,
          medicineId,
          batchId: batch._id,
          userId,
          type: "out",
          quantity: take,
          totalPrice: batchCalculatedPrice,
          createdAt: new Date(),
        },
      ],
      { session },
    );

    remaining -= take;
  }

  return {
    brandName: medicine.brandName,
    systemTotalPrice,
  };
};;

export const searchMedicinesForSale = async (searchQuery: string) => {
  const terms = searchQuery.split(',').map(t => t.trim()).filter(t => t !== "");
  
  // Build OR conditions for every term provided
  const orConditions = terms.map(term => ({
    $or: [
      { brandName: { $regex: term, $options: 'i' } },
      { genericName: { $regex: term, $options: 'i' } }
    ]
  }));

  // Find medicines matching any of the terms
  const medicines = await MedicineModel.find({ $or: orConditions })
    .populate('shelfId')
    .lean();

  const results = [];

  for (const med of medicines) {
    // Get stock and price from active batches
    const batches = await BatchModel.find({
      medicineId: med._id,
      quantity: { $gt: 0 },
      expiryDate: { $gt: new Date() }
    }).sort({ expiryDate: 1 });

    const totalStock = batches.reduce((acc, b) => acc + b.quantity, 0);
    const firstBatch = batches[0];

    let displayPrice = 0;
    if (firstBatch) {
      displayPrice = [BaseUnit.TABLET, BaseUnit.CAPSULE].includes(med.baseUnit as BaseUnit)
        ? firstBatch.storePrice * firstBatch.unitsPerPackage
        : firstBatch.storePrice;
    }

    results.push({
      id: med._id,
      brandName: med.brandName,
      genericName: med.genericName,
      baseUnit: med.baseUnit,
      shelf: med.shelfId ? (med.shelfId as any).shelfTag : 'N/A',
      location: med.shelfId ? (med.shelfId as any).description : 'N/A',
      totalStock,
      displayPrice, // Price per strip or per piece
      priceUnit: [BaseUnit.TABLET, BaseUnit.CAPSULE].includes(med.baseUnit as BaseUnit) ? 'strip' : 'piece'
    });
  }

  return results;
};