import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import userRoutes from "./modules/user/presentation/user.routes";
import inventoryRoutes from "./modules/inventory/presentation/inventory.routes";
import catalogRoutes from "./modules/catalog/presentation/catalog.routes";
import analyticsRoutes from "./modules/analytics/presentation/analytics.routes";
import salesRoutes from "./modules/sales/presentation/sale.routes";
import procurementRoutes from "./modules/procurement/presentation/procurement.routes";


const app: Application = express();
// GLOBAL MIDDLEWARES HANDLING
app.use(helmet()); 
app.use(cors()); 
app.use(morgan('dev')); 

// Body Parsers
app.use(express.json({ limit: '10mb' })); 
app.use(express.urlencoded({ extended: true }));

// DOMAIN ROUTES
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/inventory", inventoryRoutes);
app.use("/api/v1/catalog", catalogRoutes);
app.use("/api/v1/analytics", analyticsRoutes);
app.use("/api/v1/sales", salesRoutes);
app.use("/api/v1/procurement", procurementRoutes);
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "UP", timestamp: new Date().toISOString() });
});

// ERROR HANDLING
// 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ message: `Route ${req.originalUrl} not found` });
});

// Global Error Middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  const statusCode = err.statusCode || 500;
  console.error(`[ERROR]: ${err.message}`);
  
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

export default app;