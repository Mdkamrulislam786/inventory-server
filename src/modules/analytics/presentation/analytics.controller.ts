import { Request, Response, NextFunction } from 'express';
import * as AnalyticsService from '../application/analytics.service';

export const getDailyStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const report = await AnalyticsService.getDailyProfit(new Date());
    res.status(200).json({ 
      status: 'success', 
      data: report[0] || { totalSales: 0, netProfit: 0 } 
    });
  } catch (err) { next(err); }
};

export const getExpiryReports = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const alerts = await AnalyticsService.getExpiryAlerts(days);
    res.status(200).json({ status: 'success', data: alerts });
  } catch (err) { next(err); }
};

export const getStockAlerts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const threshold = parseInt(req.query.threshold as string) || 50;
    const stock = await AnalyticsService.getLowStockAlerts(threshold);
    res.status(200).json({ status: 'success', data: stock });
  } catch (err) { next(err); }
};

export const getFinancialStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Default to today (start of day to end of day)
    const start = req.query.startDate ? new Date(req.query.startDate as string) : new Date();
    start.setHours(0, 0, 0, 0);
    
    const end = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
    end.setHours(23, 59, 59, 999);

    const data = await AnalyticsService.getFinancialSummary(start, end);
    res.status(200).json({ status: 'success', data });
  } catch (err) {
    next(err);
  }
};

export const getTopSelling = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = parseInt(req.query.limit as string) || 5;
    const data = await AnalyticsService.getTopSellingMedicines(limit);
    res.status(200).json({ status: 'success', data });
  } catch (err) {
    next(err);
  }
};

export const getEmployeeStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await AnalyticsService.getEmployeePerformance();
    res.status(200).json({ status: 'success', data });
  } catch (err) {
    next(err);
  }
};

export const getDebtSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await AnalyticsService.getSupplierDebtSummary();
    res.status(200).json({ status: 'success', data });
  } catch (err) {
    next(err);
  }
};