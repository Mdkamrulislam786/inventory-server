import { Request, Response, NextFunction } from 'express';
import * as ProcurementService from '../application/procurement.service';

export const createSupplier = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // FIX: Call the service method, not the model
    const supplier = await ProcurementService.registerSupplier(req.body);
    res.status(201).json({ 
      status: 'success', 
      data: supplier 
    });
  } catch (err) { 
    next(err); 
  }
};

export const paySupplier = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { supplierId, amount, method } = req.body as { 
      supplierId: string; 
      amount: number; 
      method: string 
    };
    const result = await ProcurementService.settlePayment(supplierId, amount, method);
    res.status(200).json({ status: 'success', data: result });
  } catch (err) { 
    next(err); 
  }
};

export const returnItems = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await ProcurementService.processReturn(req.body);
    res.status(200).json({ status: 'success', data: result });
  } catch (err) { next(err); }
};