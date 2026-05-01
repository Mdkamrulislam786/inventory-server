import dotenv from "dotenv";
import app from "./app";
import connectDB from "./config/database";
import { initNotificationScheduler } from "./modules/notifications/application/scheduler";

// 1. Load environment variables
dotenv.config();

const PORT = process.env.PORT || 5000;

// 2. Connect to Database & Start Server
const startServer = async () => {
  try {
    await connectDB();

    const server = app.listen(PORT, () => {
      console.log(
        `🚀 Pharmacy Inventory Backend running on http://localhost:${PORT}`,
      );
    });

    // 3. Handle Graceful Shutdown
    process.on("SIGTERM", () => {
      console.log("SIGTERM signal received: closing HTTP server");
      server.close(() => {
        console.log("HTTP server closed");
        process.exit(0);
      });
    });

    // Start the 10 AM Cron Job
    initNotificationScheduler();
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
