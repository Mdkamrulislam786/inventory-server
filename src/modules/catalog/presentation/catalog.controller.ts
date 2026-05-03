import { Request, Response, NextFunction } from 'express';
import * as CatalogService from '../application/catalog.service';

// --- MEDICINE ---
export const createMedicine = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const medicine = await CatalogService.createMedicine(req.body);
    res.status(201).json({ status: 'success', data: medicine });
  } catch (err) { next(err); }
};

export const getMedicines = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = req.query.search as string;
    const results = await CatalogService.searchMedicines(query || '');
    res.status(200).json({ status: 'success', data: results });
  } catch (err) { next(err); }
};



// --- MANUFACTURER ---
export const createManufacturer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, code } = req.body;
    const manufacturer = await CatalogService.createManufacturer(name, code);
    res.status(201).json({ status: "success", data: manufacturer });
  } catch (err) { next(err); }
};

// --- SHELF ---
export const createShelf = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { shelfTag, description } = req.body;
    const shelf = await CatalogService.createShelf(shelfTag, description);
    res.status(201).json({ status: 'success', data: shelf });
  } catch (err) { next(err); }
};

// --- OCR LOGIC ---
export const matchShelf = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { shelfTag, trayIds } = req.body;
    const matches = await CatalogService.matchTrayToShelf(shelfTag, trayIds);
    res.status(200).json({ status: 'success', data: matches });
  } catch (err) { next(err); }
};