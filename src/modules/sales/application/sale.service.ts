import mongoose, { Types } from 'mongoose';
import { processSale } from '../../inventory/application/inventory.service';
import { SaleModel } from '../infrastructure/sale.model';
import { ApiError } from '../../../core/errors/api-error';

export const executeCheckout = async (userId: string, data: {
  items: { medicineId: string, quantity: number }[],
  discountTk: number,
  reason?: string
}) => {
  // 1. Pre-Transaction Validation
  if (!data.items || data.items.length === 0) {
    throw new ApiError(400, "Cannot process an empty sale. Please add items to the tray.");
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    let totalAmount = 0;
    const saleItems = [];

    // 2. Core Processing Loop
    for (const item of data.items) {
      // processSale handles its own stock-level ApiErrors (Insufficient Stock)
      // and re-throws them, which we catch below.
      const batchLogs = await processSale(userId, item.medicineId, item.quantity, session);
      
      // We take the storePrice from the first batch deducted (Admin-set price)
      const unitPrice = batchLogs[0].priceAtSale; 
      const subtotal = item.quantity * unitPrice;
      
      totalAmount += subtotal;
      saleItems.push({
        medicineId: new Types.ObjectId(item.medicineId),
        quantity: item.quantity,
        unitPrice,
        subtotal
      });
    }

    // 3. Financial Guard: Ensure the discount doesn't exceed the total
    const finalAmount = totalAmount - (data.discountTk || 0);
    
    if (finalAmount < 0) {
      throw new ApiError(400, `Invalid Discount: Total is ${totalAmount} TK, but discount is ${data.discountTk} TK.`);
    }

    // 4. Persistence
    const [newSale] = await SaleModel.create([{
      items: saleItems,
      totalAmount,
      discountTk: data.discountTk,
      reason: data.reason,
      finalAmount,
      soldBy: new Types.ObjectId(userId)
    }], { session });

    await session.commitTransaction();
    return newSale;

  } catch (err: any) {
    // 5. Atomic Rollback
    // This ensures if stock deduction worked but sale creation failed, 
    // the stock is returned to the shelf.
    await session.abortTransaction();

    // 6. Error Translation
    // If it's already an ApiError (from processSale), re-throw it.
    // Otherwise, wrap it in a 500 Internal Server Error.
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError(500, err.message || "An unexpected error occurred during checkout.");
  } finally {
    session.endSession();
  }
};

export const getSalesList = async (startDate: Date, endDate: Date) => {
  return await SaleModel.find({
    createdAt: { $gte: startDate, $lte: endDate }
  })
  .populate('soldBy', 'name')
  .populate('items.medicineId', 'brandName')
  .sort({ createdAt: -1 })
  .lean();
};