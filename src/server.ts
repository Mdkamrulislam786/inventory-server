import express, { Application, Request, Response } from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI!)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('DB Connection Error:', err));

app.get('/', (req: Request, res: Response) => {
  res.send('API is running on Mac Mini M4!');
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});