import { Document, Types } from 'mongoose';

export type UserRole = 'admin' | 'employee';

export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  username: string;
  password?: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}