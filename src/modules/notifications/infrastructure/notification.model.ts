import { Schema, model } from 'mongoose';
import { INotification } from '../domain/notification.entity';

const notificationSchema = new Schema<INotification>({
  recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  body: { type: String, required: true },
  type: { type: String, enum: ['expiry', 'low_stock', 'system'], required: true },
  isRead: { type: Boolean, default: false }
}, { timestamps: true });

export const NotificationModel = model<INotification>('Notification', notificationSchema);