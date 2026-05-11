import { StockInDTO } from "../../inventory/domain/inventory.entity";

export interface PurchasePayload {
  supplierId: string;
  invoiceNumber?: string;
  items: StockInDTO[];
  totalAmount: number; // The sum of all totalPurchasePrice in items
}