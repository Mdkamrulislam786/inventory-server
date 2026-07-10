import { Schema, model } from 'mongoose';

const shopSchema = new Schema(
  {
    name: { type: String, required: true },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    location: { type: Schema.Types.String, ref: "User", required: true },
    // Subscription Fields
    status: {
      type: String,
      enum: ["trialing", "active", "suspended"],
      default: "trialing",
    },
    trialEndDate: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    },
    subscriptionPlan: { type: String, default: "free" }, // e.g., 'free', 'basic', 'pro'
  },
  { timestamps: true },
);

export const ShopModel = model('Shop', shopSchema);