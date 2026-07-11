import { SaleModel } from "../infrastructure/sale.model";
import mongoose from "mongoose";
import { deductStockFEFO } from "../../inventory/application/inventory.service";
import { CheckoutPayload } from "../domain/sale.types";

export const checkout = async (
  employeeId: string,
  payload: CheckoutPayload,
) => {
  const { cartItems, customerName } = payload;

  // Start Session for Atomicity
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    let grandTotal = 0;
    const processedItems = [];

    // 1. Create Initial Sale Record
    const [newSale] = await SaleModel.create(
      [
        {
          employeeId,
          customerName,
          items: [], // Will populate later
          totalAmount: 0,
        },
      ],
      { session },
    );

    // 2. Loop through cart and deduct stock
    for (const item of cartItems) {
      const deductionResult = await deductStockFEFO(
        item.medicineId,
        item.quantity,
        newSale._id.toString(),
        employeeId,
        item.manualPrice,
        session, // Pass the session down
      );

      const finalItemPrice =
        item.manualPrice ?? deductionResult.systemTotalPrice;
      grandTotal += finalItemPrice;

      processedItems.push({
        medicineId: item.medicineId,
        brandName: deductionResult.brandName,
        quantity: item.quantity,
        soldPrice: finalItemPrice,
        isManualPrice: !!item.manualPrice,
      });
    }

    // 3. Update Sale total and final items atomically
    newSale.items = processedItems as any;
    newSale.totalAmount = grandTotal;
    await newSale.save({ session });

    // Commit Transaction
    await session.commitTransaction();
    return newSale;
  } catch (err) {
    // If anything fails, rollback everything (Stock, Sale record, Transactions)
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};;;

export const getSalesList = async (startDate: Date, endDate: Date) => {
  return await SaleModel.find({
    createdAt: { $gte: startDate, $lte: endDate },
  })
    .populate("soldBy", "name")
    .populate("items.medicineId", "brandName")
    .sort({ createdAt: -1 })
    .lean();
};

// Fetch filtered history (Admin or Manager view)
export const getSalesHistory = async (filters: {
  startDate?: Date;
  endDate?: Date;
  employeeId?: string;
}) => {
  const query: any = {};

  if (filters.startDate && filters.endDate) {
    query.createdAt = { $gte: filters.startDate, $lte: filters.endDate };
  }
  if (filters.employeeId) {
    query.employeeId = filters.employeeId;
  }

  return await SaleModel.find(query)
    .sort({ createdAt: -1 })
    .populate("employeeId", "name");
};

// Fetch a single sale for receipt printing
export const getSaleById = async (id: string) => {
  const sale = await SaleModel.findById(id).populate("employeeId", "name");
  if (!sale) throw new Error("Sale not found");
  return sale;
};
