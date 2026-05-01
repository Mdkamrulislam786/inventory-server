import { Document, Types } from 'mongoose';

export interface INotification extends Document {
  recipient: Types.ObjectId;
  title: string;
  body: string;
  type: 'expiry' | 'low_stock' | 'system';
  isRead: boolean;
  createdAt: Date;
}