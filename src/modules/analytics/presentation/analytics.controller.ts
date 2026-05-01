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