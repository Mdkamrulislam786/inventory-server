import { Request, Response, NextFunction } from 'express';
import * as SaleService from '../application/sale.service';

export const checkout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sale = await SaleService.executeCheckout(req.user.id, req.body);
    res.status(201).json({ status: 'success', data: sale });
  } catch (err) { next(err); }
};

export const getHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { start, end } = req.query;
    const s = start ? new Date(start as string) : new Date(new Date().setHours(0,0,0,0));
    const e = end ? new Date(end as string) : new Date(new Date().setHours(23,59,59,999));

    const history = await SaleService.getSalesList(s, e);
    res.status(200).json({ status: 'success', data: history });
  } catch (err) { next(err); }
};