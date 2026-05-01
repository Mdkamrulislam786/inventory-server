import { TransactionModel, BatchModel } from '../../inventory/infrastructure/inventory.model';
/**
 * DAILY PROFIT & LOSS
 * Matches today's sales and joins with Batches to find the original purchase cost.
 */
export const getDailyProfit = async (date: Date) => {
  const startOfDay = new Date(date.setHours(0, 0, 0, 0));
  const endOfDay = new Date(date.setHours(23, 59, 59, 999));

  return await TransactionModel.aggregate([
    {
      $match: {
        type: 'out',
        createdAt: { $gte: startOfDay, $lte: endOfDay }
      }
    },
    {
      $lookup: {
        from: 'batches',
        localField: 'batchId',
        foreignField: '_id',
        as: 'batchDetails'
      }
    },
    { $unwind: '$batchDetails' },
    {
      $project: {
        salesValue: '$totalPrice',
        // Cost Value = Transaction Quantity * Batch Purchase Price
        costValue: { $multiply: ['$quantity', '$batchDetails.purchasePrice'] }
      }
    },
    {
      $group: {
        _id: null,
        totalSales: { $sum: '$salesValue' },
        totalCost: { $sum: '$costValue' },
        netProfit: { $sum: { $subtract: ['$salesValue', '$costValue'] } },
        transactionCount: { $sum: 1 }
      }
    }
  ]);
};

/**
 * EXPIRY ALERTS
 * Finds batches expiring within the next 'days' (default 30)
 */
export const getExpiryAlerts = async (days: number = 30) => {
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() + days);

  return await BatchModel.find({
    quantity: { $gt: 0 },
    expiryDate: { $lte: thresholdDate, $gt: new Date() }
  })
  .populate({
    path: 'medicineId',
    select: 'brandName'
  })
  .sort({ expiryDate: 1 })
  .lean();
};

/**
 * LOW STOCK ALERT
 * Groups all batches by medicine and sums the total quantity.
 */
export const getLowStockAlerts = async (threshold: number = 50) => {
  return await BatchModel.aggregate([
    { $group: { _id: '$medicineId', totalQty: { $sum: '$quantity' } } },
    { $match: { totalQty: { $lte: threshold } } },
    {
      $lookup: {
        from: 'medicines',
        localField: '_id',
        foreignField: '_id',
        as: 'medicine'
      }
    },
    { $unwind: '$medicine' },
    {
      $project: {
        medicineName: '$medicine.brandName',
        currentStock: '$totalQty',
        baseUnit: '$medicine.baseUnit'
      }
    }
  ]);
};