import { Types } from 'mongoose';
import { SupplierModel, SupplierPaymentModel, ReturnModel } from '../infrastructure/procurement.model';
import { BatchModel } from '../../inventory/infrastructure/inventory.model';
import { ApiError } from '../../../core/errors/api-error';
import { ISupplier } from '../domain/procurement.entity';

/**
 * Add a new supplier to the system
 */
export const registerSupplier = async (supplierData: Partial<ISupplier>): Promise<ISupplier> => {
  const existing = await SupplierModel.findOne({ name: supplierData.name });
  if (existing) throw new ApiError(400, 'Supplier with this name already exists');
  
  return await SupplierModel.create(supplierData);
};

/**
 * Record a payment made to a supplier
 */
export const settlePayment = async (supplierId: string, amount: number, method: string) => {
  const supplier = await SupplierModel.findById(supplierId);
  if (!supplier) throw new ApiError(404, 'Supplier not found');

  const payment = await SupplierPaymentModel.create({
    supplierId: new Types.ObjectId(supplierId),
    amountPaid: amount,
    paymentMethod: method
  });

  supplier.totalOutstanding -= amount;
  await supplier.save();

  return { payment, remainingBalance: supplier.totalOutstanding };
};

/**
 * Handle Returns (Expired/Damaged)
 * Deducts stock from Batch and deducts value from Supplier Debt
 */
export const processReturn = async (data: {
  batchId: string;
  quantity: number;
  reason: 'expired' | 'damaged' | 'wrong_delivery';
}) => {
  const batch = await BatchModel.findById(data.batchId).populate('medicineId');
  if (!batch || batch.quantity < data.quantity) {
    throw new ApiError(400, 'Invalid batch or insufficient quantity to return');
  }

  // Calculate the financial value of the return based on purchase price
  const creditAmount = data.quantity * batch.purchasePrice;

  // 1. Remove stock from batch
  batch.quantity -= data.quantity;
  await batch.save();

  // 2. Record the return
  const returnEntry = await ReturnModel.create({
    supplierId: batch.supplierId, // Assuming batch has supplierId from Stock-In
    batchId: batch._id,
    medicineId: batch.medicineId,
    quantityReturned: data.quantity,
    reason: data.reason,
    creditReceived: creditAmount
  });

  // 3. Adjust supplier outstanding balance (if supplierId exists on batch)
  if (batch.supplierId) {
    await SupplierModel.findByIdAndUpdate(batch.supplierId, {
      $inc: { totalOutstanding: -creditAmount }
    });
  }

  return returnEntry;
};