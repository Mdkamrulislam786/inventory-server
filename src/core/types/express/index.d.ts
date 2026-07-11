import { IUser } from "../modules/auth/domain/user.entity"; // Import your interface
declare global {
  namespace Express {
    interface Request {
      user: IUser; // Now TypeScript knows req.user exists
    }
  }
}
