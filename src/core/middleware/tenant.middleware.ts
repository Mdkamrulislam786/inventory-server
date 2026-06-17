import { Request, Response, NextFunction } from 'express';
import { tenantContext } from '../tenant.context';

export const setTenantContext = (req: Request, res: Response, next: NextFunction) => {
  // Assuming 'req.user' is populated by your 'protect' middleware
  // and your User model has a 'shopId' field
  const shopId = (req as any).user?.shopId; 

  if (!shopId) {
    return next(new Error("No shop associated with this user"));
  }

  // Run the rest of the request within this context
  tenantContext.run(shopId, () => next());
};