import cron from 'node-cron';
import { getExpiryAlerts, getLowStockAlerts } from '../../analytics/application/analytics.service';
import { sendPushNotification } from './notification.service';
import { UserModel } from '../../user/infrastructure/user.model';

// Schedule for 10:00 AM Bangladesh Time
// Bangladesh is UTC+6. 10:00 AM BST is 04:00 AM UTC.
export const initNotificationScheduler = () => {
  cron.schedule('0 10 * * *', async () => {
    console.log('Running daily Pharmacy check at 10:00 AM BST...');

    const adminUser = await UserModel.findOne({ role: 'admin' });
    if (!adminUser) return;

    // 1. Check Expiry
    const expiringSoon = await getExpiryAlerts(30);
    if (expiringSoon.length > 0) {
      await sendPushNotification(
        adminUser._id.toString(),
        '⚠️ Expiry Alert',
        `You have ${expiringSoon.length} items expiring within 30 days.`,
        'expiry'
      );
    }

    // 2. Check Low Stock
    const lowStock = await getLowStockAlerts(20);
    if (lowStock.length > 0) {
      await sendPushNotification(
        adminUser._id.toString(),
        '📦 Low Stock Alert',
        `There are ${lowStock.length} items running low. Check inventory!`,
        'low_stock'
      );
    }
  }, {
    timezone: "Asia/Dhaka" // Explicitly setting the timezone
  });
};