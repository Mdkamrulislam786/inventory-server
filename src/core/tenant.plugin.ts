import { tenantContext } from "./tenant.context";

export const tenantPlugin = (schema: any) => {
  // Add the field
  schema.add({ shopId: { type: String, required: false, index: true } });
  // NOTE: Changed required to false (explained below)

  // Use 'async' to avoid 'next' issues
  schema.pre(/^find/, async function (this: any) {
    const shopId = tenantContext.getStore();
    if (shopId) {
      this.where({ shopId });
    }
  });

  // Use 'async' to avoid 'next' issues
  schema.pre("save", async function (this: any) {
    const shopId = tenantContext.getStore();
    // Fix: removed 'this.this' typo and handled undefined shopId
    if (shopId && !this.shopId) {
      this.shopId = shopId;
    }
  });
};
