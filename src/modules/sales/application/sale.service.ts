import { SaleModel } from "../infrastructure/sale.model";
import * as InventoryService from "../../inventory/application/inventory.service";
import { CheckoutPayload } from "../domain/sale.types";

export const checkout = async (
  employeeId: string,
  payload: CheckoutPayload,
) => {
  const { cartItems, customerName } = payload;
  let grandTotal = 0;
  const processedItems = [];

  // 1. Create Sale Record (to get the ID for linking)
  const newSale = new SaleModel({
    employeeId,
    customerName,
    items: [],
    totalAmount: 0,
  });

  for (const item of cartItems) {
    // 2. Inventory Service now handles everything related to stock + transactions
    const deductionResult = await InventoryService.deductStockFEFO(
      item.medicineId,
      item.quantity,
      newSale._id.toString(), // Link to this sale
      employeeId,
      item.manualPrice,
    );

    const finalItemPrice = item.manualPrice ?? deductionResult.systemTotalPrice;
    grandTotal += finalItemPrice;

    processedItems.push({
      medicineId: item.medicineId,
      brandName: deductionResult.brandName,
      quantity: item.quantity,
      soldPrice: finalItemPrice,
      isManualPrice: !!item.manualPrice,
    });
  }

  // 3. Update Sale total and final items
  newSale.items = processedItems as any;
  newSale.totalAmount = grandTotal;

  return await newSale.save();
};;

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
