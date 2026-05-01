import { Request, Response, NextFunction } from 'express';
import * as CatalogService from '../application/catalog.service';

export const getMedicines = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = req.query.search as string;
    const results = await CatalogService.searchMedicines(query || '');
    res.status(200).json({ status: 'success', data: results });
  } catch (err) { next(err); }
};

export const postMedicine = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const medicine = await CatalogService.createMedicine(req.body);
    res.status(201).json({ status: 'success', data: medicine });
  } catch (err) { next(err); }
};

export const matchShelf = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { shelfTag, trayIds } = req.body as { shelfTag: string, trayIds: string[] };
    const matches = await CatalogService.matchTrayToShelf(shelfTag, trayIds);
    res.status(200).json({ status: 'success', data: matches });
  } catch (err) { next(err); }
};