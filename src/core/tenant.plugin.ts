import { tenantContext } from "./tenant.context";

export const tenantPlugin = (schema: any) => {
  // This stops Mongoose from crashing during validation.
  schema.add({
    shopId: { type: String, required: false, index: true },
  });

  schema.pre("save", async function (this: any) {
    const shopId = tenantContext.getStore();

    if (!shopId) {
      throw new Error(
        `[TenantError]: Missing shopId context for ${this.constructor.modelName}. Is setTenantContext middleware active?`,
      );
    }

    this.shopId = shopId;
  });

  schema.pre(/^find/, async function (this: any) {
    const shopId = tenantContext.getStore();
    if (shopId) {
      this.where({ shopId });
    }
  });
};;;;;
