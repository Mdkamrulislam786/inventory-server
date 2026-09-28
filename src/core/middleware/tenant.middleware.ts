import { Request, Response, NextFunction } from "express";
import { tenantContext } from "../tenant.context";

export const setTenantContext = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const shopId = req.user?.shopId;
  if (!shopId) {
    return next(new Error("Unauthorized: No shop associated with this user"));
  }
  tenantContext.run(shopId, () => next());
};
