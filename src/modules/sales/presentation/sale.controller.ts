import { Request, Response, NextFunction } from 'express';
import * as SalesService from "../application/sale.service";

export const checkout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sale = await SalesService.checkout(req.user.id, req.body);
    res.status(201).json({ status: 'success', data: sale });
  } catch (err) { next(err); }
};

export const getSaleDetail = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const data = await SalesService.getSaleById(req.params.id as string);
    res.status(200).json({ status: "success", data });
  } catch (err) {
    next(err);
  }
};

export const getSalesHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate, employeeId } = req.query;

    const filters = {
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      employeeId: employeeId as string,
    };

    const data = await SalesService.getSalesHistory(filters);
    res.status(200).json({ status: "success", data });
  } catch (err) {
    next(err);
  }
};