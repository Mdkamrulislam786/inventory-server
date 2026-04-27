import { UserRole } from '../../../modules/user/domain/user.entity';
import { Types } from 'mongoose';

declare global {
  namespace Express {
    interface Request {
      user: {
        id: string;
        role: UserRole;
      };
    }
  }
}