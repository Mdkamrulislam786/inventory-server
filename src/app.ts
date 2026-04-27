import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import userRoutes from "./modules/user/presentation/user.routes";
// Import Routes (Placeholders based on your DDD structure)
// import identityRoutes from './modules/identity/presentation/identity.routes';
// import inventoryRoutes from './modules/inventory/presentation/inventory.routes';

const app: Application = express();
// --- GLOBAL MIDDLEWARES ---
// Security Headers
app.use(helmet()); 
// Enable CORS for your React Native app
app.use(cors()); 
// Logging (using 'dev' for development)
app.use(morgan('dev')); 

// Body Parsers
app.use(express.json({ limit: '10mb' })); 
app.use(express.urlencoded({ extended: true }));

// --- DOMAIN ROUTES ---

app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'UP', timestamp: new Date().toISOString() });
});

// Example of where you'll mount your modules
// app.use('/api/v1/auth', identityRoutes);
// app.use('/api/v1/inventory', inventoryRoutes);
app.use("/api/v1/users", userRoutes);

// --- ERROR HANDLING ---

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