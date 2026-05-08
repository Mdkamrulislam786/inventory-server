import { Request, Response, NextFunction } from "express";
import * as InventoryService from "../application/inventory.service";
import { StockListQuery } from "../domain/inventory.entity";

export const addStock = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // req.user.id comes from your 'protect' middleware
    const batch = await InventoryService.stockIn(req.user.id, req.body);
    res.status(201).json({ status: "success", data: batch });
  } catch (err) {
    next(err);
  }
};

export const sellItems = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { medicineId, quantity } = req.body;
    const result = await InventoryService.processSale(
      req.user.id,
      medicineId,
      quantity,
    );
    res.status(200).json({ status: "success", data: result });
  } catch (err) {
    next(err);
  }
};

export const getStockStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const status = await InventoryService.getMedicineStockStatus(
      req.params.medicineId as string,
    );
    res.status(200).json({ status: "success", data: status });
  } catch (err) {
    next(err);
  }
};

export const getStockList = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query: StockListQuery = {
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      search: req.query.search as string
    };

    const results = await InventoryService.getPaginatedStockList(query);

    res.status(200).json({
      status: 'success',
      ...results
    });
  } catch (err) {
    next(err);
  }
};