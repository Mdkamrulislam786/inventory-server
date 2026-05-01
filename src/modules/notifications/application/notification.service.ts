import admin from 'firebase-admin';
import { NotificationModel } from '../infrastructure/notification.model';
import { UserModel } from '../../user/infrastructure/user.model';
import { Message } from 'firebase-admin/messaging';

// Initialize Firebase (usually in a config file, but here for clarity)
// admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

export const sendPushNotification = async (
  userId: string, 
  title: string, 
  body: string, 
  type: 'expiry' | 'low_stock' | 'system'
) => {
  const user = await UserModel.findById(userId);
  if (!user || !user.fcmToken) return; // Silent return if no token

  const message: Message = {
    notification: { title, body },
    token: user.fcmToken as unknown as string,
    data: { type, click_action: 'FLUTTER_NOTIFICATION_CLICK' }
  };

  try {
    // 1. Send to Firebase
    await admin.messaging().send(message);

    // 2. Save in DB for "In-App" notification history
    await NotificationModel.create({
      recipient: user._id,
      title,
      body,
      type
    });
  } catch (error) {
    console.error('Push Notification Error:', error);
  }
};