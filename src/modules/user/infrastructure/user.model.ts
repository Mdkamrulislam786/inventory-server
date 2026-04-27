import { Schema, model } from 'mongoose';
import bcryptjs from 'bcryptjs';
import { IUser } from '../domain/user.entity';

const userSchema = new Schema<IUser>({
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ['admin', 'employee'], default: 'employee' }
}, { timestamps: true });

// We explicitly type 'this' and remove the 'next' parameter
userSchema.pre<IUser>('save', async function () {
  // If password isn't modified, we just return (equivalent to next())
  if (!this.isModified('password')) return;

  // Narrow the type to ensure password is a string
  if (this.password) {
    this.password = await bcryptjs.hash(this.password, 12);
  }
  
  // No next() needed! The resolution of this async function 
  // tells Mongoose to proceed to the save operation.
});

export const UserModel = model<IUser>('User', userSchema);