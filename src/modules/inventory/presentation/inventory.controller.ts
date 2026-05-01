import { Request, Response, NextFunction } from 'express';
import * as InventoryService from '../application/inventory.service';

export const addStock = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // req.user.id comes from your 'protect' middleware
    const batch = await InventoryService.stockIn(req.user.id, req.body);
    res.status(201).json({ status: 'success', data: batch });
  } catch (err) { next(err); }
};

export const sellItems = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { medicineId, quantity } = req.body;
    const result = await InventoryService.processSale(req.user.id, medicineId, quantity);
    res.status(200).json({ status: 'success', data: result });
  } catch (err) { next(err); }
};