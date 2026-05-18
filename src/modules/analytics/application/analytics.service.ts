import { TransactionModel, BatchModel } from '../../inventory/infrastructure/inventory.model';
import { SaleModel } from '../../sales/infrastructure/sale.model';
import { SupplierModel } from '../../procurement/infrastructure/procurement.model';

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

export const getFinancialSummary = async (startDate: Date, endDate: Date) => {
  // 1. Calculate Total Revenue from Sales
  const revenueData = await SaleModel.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: "$totalAmount" },
        saleCount: { $sum: 1 },
      },
    },
  ]);

  // 2. Fetch the purchasePrice from the Batches collection
  const cogsData = await TransactionModel.aggregate([
    {
      $match: {
        type: "out",
        saleId: { $ne: null },
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      // Join with the batches collection to find what you originally paid for this medicine
      $lookup: {
        from: "batches",
        localField: "batchId",
        foreignField: "_id",
        as: "batchDetails",
      },
    },
    { $unwind: "$batchDetails" },
    {
      // Calculate the actual cost: transaction quantity * batch wholesale cost
      $addFields: {
        calculatedCost: {
          $multiply: ["$quantity", "$batchDetails.purchasePrice"],
        },
      },
    },
    {
      // Sum the calculated wholesale costs together
      $group: {
        _id: null,
        totalCost: { $sum: "$calculatedCost" },
      },
    },
  ]);

  const revenue = revenueData[0]?.totalRevenue || 0;
  const cogs = cogsData[0]?.totalCost || 0;

  return {
    revenue,
    cogs,
    netProfit: revenue - cogs,
    saleCount: revenueData[0]?.saleCount || 0,
    period: { start: startDate, end: endDate },
  };
};

export const getTopSellingMedicines = async (limit: number = 5) => {
  return await SaleModel.aggregate([
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.medicineId",
        totalSold: { $sum: "$items.quantity" },
        revenueGenerated: { $sum: "$items.soldPrice" }
      }
    },
    { $sort: { totalSold: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'medicines',
        localField: '_id',
        foreignField: '_id',
        as: 'details'
      }
    },
    { $unwind: "$details" },
    {
      $project: {
        brandName: "$details.brandName",
        totalSold: 1,
        revenueGenerated: 1
      }
    }
  ]);
};

export const getEmployeePerformance = async () => {
  return await SaleModel.aggregate([
    {
      $group: {
        _id: "$employeeId",
        totalSales: { $sum: "$totalAmount" },
        transactionCount: { $sum: 1 }
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'employee'
      }
    },
    { $unwind: "$employee" },
    {
      $project: {
        name: "$employee.name",
        totalSales: 1,
        transactionCount: 1,
        averageSaleValue: { $divide: ["$totalSales", "$transactionCount"] }
      }
    },
    { $sort: { totalSales: -1 } }
  ]);
};

export const getSupplierDebtSummary = async () => {
  const stats = await SupplierModel.aggregate([
    {
      $group: {
        _id: null,
        totalOutstanding: { $sum: "$totalOutstanding" },
        supplierCount: { $sum: 1 }
      }
    }
  ]);
  
  return stats[0] || { totalOutstanding: 0, supplierCount: 0 };
};