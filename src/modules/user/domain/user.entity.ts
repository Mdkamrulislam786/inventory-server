import { Document, Types } from 'mongoose';

export type UserRole = "admin" | "employee" | "platform-admin";

export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  username: string;
  email?: string;
  phone: string;
  password?: string;
  role: UserRole;
  shopId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  fcmToken: { type: String };
}