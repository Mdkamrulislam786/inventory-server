import { Request, Response, NextFunction } from 'express';
import * as ProcurementService from '../application/procurement.service';
import { ISupplierPayment } from "../domain/procurement.entity";

export const createSupplier = async (req: Request, res: Response, next: NextFunction) => {
  try {
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
    const { supplierId, amountPaid, paymentMethod } =
      req.body as Partial<ISupplierPayment>;
    const result = await ProcurementService.settlePayment(
      supplierId!,
      amountPaid!,
      paymentMethod!,
    );
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

export const createPurchase = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await ProcurementService.processPurchase(req.user.id, req.body);
    res.status(201).json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
};

export const getSuppliers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await ProcurementService.getAllSuppliers();
    res.status(200).json({ status: 'success', data });
  } catch (err) {
    next(err);
  }
};

export const getLedger = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await ProcurementService.getSupplierLedger(req.params.id as string);
    res.status(200).json({ status: 'success', data });
  } catch (err) {
    next(err);
  }
};