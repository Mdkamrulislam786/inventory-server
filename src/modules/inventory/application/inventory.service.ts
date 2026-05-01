import { Types } from 'mongoose';
import { BatchModel, TransactionModel } from '../infrastructure/inventory.model';
import { ApiError } from '../../../core/errors/api-error';
import { MedicineModel } from '../../catalog/infrastructure/catalog.model';

interface StockInDTO {
  medicineId: string;
  batchNumber: string;
  expiryDate: Date;
  purchasePrice: number; // Price per Box
  mrp: number;           // Price per Base Unit (e.g., per tablet)
  boxesReceived?: number;
  manualTotalQuantity?: number;
}
/**
 * Admin: Add new stock (Stock-In)
 */
export const stockIn = async (userId: string, data: StockInDTO) => {
  const medicine = await MedicineModel.findById(data.medicineId);
  if (!medicine) throw new ApiError(404, 'Medicine not found in catalog');

  let finalBaseQuantity: number;

  // Logic: Manual override takes priority, otherwise calculate from boxes
  if (data.manualTotalQuantity) {
    finalBaseQuantity = data.manualTotalQuantity;
  } else if (data.boxesReceived && medicine.packaging) {
    const unitsPerStrip = medicine.packaging.unitsPerStrip || 1;
    const stripsPerBox = medicine.packaging.stripsPerBox || 1;
    
    // Formula: Total Tablets = Boxes * StripsPerBox * UnitsPerStrip
    finalBaseQuantity = data.boxesReceived * stripsPerBox * unitsPerStrip;
  } else {
    throw new ApiError(400, 'Either boxesReceived or manualTotalQuantity must be provided');
  }

  // Calculate purchase price per unit for profit tracking
  // If they bought a box for 100 BDT and it has 100 tablets, costPerUnit is 1 BDT
  const totalUnitsInBox = (medicine.packaging.stripsPerBox || 1) * (medicine.packaging.unitsPerStrip || 1);
  const costPerUnit = data.purchasePrice / totalUnitsInBox;

  const batch = await BatchModel.create({
    medicineId: new Types.ObjectId(data.medicineId),
    batchNumber: data.batchNumber,
    expiryDate: data.expiryDate,
    quantity: finalBaseQuantity,
    purchasePrice: costPerUnit, // We store the unit cost for easier math later
    mrp: data.mrp
  });

  await TransactionModel.create({
    medicineId: batch.medicineId,
    batchId: batch._id,
    userId: new Types.ObjectId(userId),
    type: 'in',
    quantity: finalBaseQuantity,
    totalPrice: data.purchasePrice * (data.boxesReceived || 1) 
  });

  return batch;
};

/**
 * Employee: Sell Medicine (Stock-Out with FEFO)
 */
export const processSale = async (userId: string, medicineId: string, quantityToSell: number) => {
  // 1. Find all active batches for this medicine, sorted by soonest expiry
  const batches = await BatchModel.find({
    medicineId: new Types.ObjectId(medicineId),
    quantity: { $gt: 0 },
    expiryDate: { $gt: new Date() }
  }).sort({ expiryDate: 1 });

  const totalAvailable = batches.reduce((acc, b) => acc + b.quantity, 0);
  if (totalAvailable < quantityToSell) {
    throw new ApiError(400, `Insufficient stock. Available: ${totalAvailable}`);
  }

  let remainingToDeduct = quantityToSell;
  const transactions = [];

  // 2. Deduct from batches following FEFO
  for (const batch of batches) {
    if (remainingToDeduct <= 0) break;

    const deduction = Math.min(batch.quantity, remainingToDeduct);
    
    batch.quantity -= deduction;
    remainingToDeduct -= deduction;

    await batch.save();

    // 3. Record transaction for each batch involved
    const transaction = await TransactionModel.create({
      medicineId: batch.medicineId,
      batchId: batch._id,
      userId: new Types.ObjectId(userId),
      type: 'out',
      quantity: deduction,
      totalPrice: deduction * batch.mrp
    });
    
    transactions.push(transaction);
  }

  return transactions;
};