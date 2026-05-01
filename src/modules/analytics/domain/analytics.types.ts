export interface IDailyReport {
  totalSales: number;
  totalCost: number;
  netProfit: number;
  transactionCount: number;
}

export interface IExpiryAlert {
  medicineName: string;
  batchNumber: string;
  expiryDate: Date;
  daysRemaining: number;
  quantityRemaining: number;
}

export interface ILowStockAlert {
  medicineName: string;
  currentStock: number;
  baseUnit: string;
}