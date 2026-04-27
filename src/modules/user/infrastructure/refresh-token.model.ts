import { Schema, model, Document, Types } from 'mongoose';

export interface IRefreshToken {
  userId: Types.ObjectId; 
  token: string;
  expiresAt: Date;
}

// Define the Document interface for Mongoose methods
export interface IRefreshTokenDocument extends IRefreshToken, Document {}

const refreshTokenSchema = new Schema<IRefreshTokenDocument>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  token: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true }
});

refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshTokenModel = model<IRefreshTokenDocument>('RefreshToken', refreshTokenSchema);