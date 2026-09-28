import { NextFunction, Response, Request } from "express";
import { ShopModel } from "../infrastructure/shop.model";

export const updateSubscription = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { shopId, status } = req.body as any; // status: 'active' or 'suspended'
    
    // Only your platform admin account should be able to call this
    if ((req.user as any).role !== 'platform-admin') {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const shop = await ShopModel.findByIdAndUpdate(
      shopId, 
      { status }, 
      { new: true }
    );
    
    res.status(200).json({ status: 'success', data: shop });
  } catch (err) {
    next(err);
  }
};