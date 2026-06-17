import { Request, Response, NextFunction } from 'express';
import { ShopModel } from '../../modules/shop/infrastructure/shop.model';

export const checkSubscription = async (req: Request, res: Response, next: NextFunction) => {
  const shopId = (req as any).shopId || (req as any).user?.shopId;

  const shop = await ShopModel.findById(shopId);

  if (!shop) return res.status(404).json({ message: "Shop not found" });

  // 1. Check if suspended
  if (shop.status === 'suspended') {
    return res.status(403).json({ message: "Your subscription has expired. Please contact support." });
  }

  // 2. Check if trial expired and auto-transition to suspended
  if (shop.status === 'trialing' && new Date() > shop.trialEndDate) {
    shop.status = 'suspended';
    await shop.save();
    return res.status(403).json({ message: "Trial period expired." });
  }

  next();
};