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

export const getSalesHistory = async (query: {
  employeeId?: string;
  type: "daily" | "monthly" | "all";
}) => {
  const filter: any = {};
  if (query.employeeId) filter.employeeId = query.employeeId;

  const now = new Date();
  if (query.type === "daily") {
    filter.createdAt = { $gte: new Date(now.setHours(0, 0, 0, 0)) };
  } else if (query.type === "monthly") {
    filter.createdAt = { $gte: new Date(now.getFullYear(), now.getMonth(), 1) };
  }

  return await SaleModel.find(filter)
    .populate("employeeId", "name")
    .sort({ createdAt: -1 });
};
