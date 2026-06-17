import { tenantContext } from './tenant.context';

export const tenantPlugin = (schema: any) => {
  schema.add({ shopId: { type: String, required: true, index: true } });

  // When searching, force filter by current shop
  schema.pre(/^find/, function (this: any, next: any) {
    const shopId = tenantContext.getStore();
    if (shopId) this.where({ shopId });
    next();
  });

  // When saving, automatically add the current shopId
  schema.pre('save', function (this: any, next: any) {
    const shopId = tenantContext.getStore();
    if (shopId && !this.shopId) this.this.shopId = shopId;
    next();
  });
};