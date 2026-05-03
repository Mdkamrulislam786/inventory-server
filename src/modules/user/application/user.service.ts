import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import bcryptjs from 'bcryptjs';
import { Types } from 'mongoose';
import { UserModel } from '../infrastructure/user.model';
import { RefreshTokenModel } from '../infrastructure/refresh-token.model';
import { IUser } from '../domain/user.entity';
import { ApiError } from '../../../core/errors/api-error';

/**
 * Helper to handle environment variables safely for JWT
 */
const getJwtOptions = (expiresIn: string | number): SignOptions => ({
  expiresIn: expiresIn as SignOptions["expiresIn"],
});

const signAccessToken = (id: string, role: string): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new ApiError(500, "JWT Access Secret is not defined");

  return jwt.sign(
    { id, role },
    secret,
    getJwtOptions(`${process.env.JWT_EXPIRES_IN}`),
  ); //7day
};

const signToken = (id: string, role: string): string => {
  const secret = process.env.JWT_SECRET;
  const expires = process.env.JWT_EXPIRES_IN;
  
  if (!secret || !expires) throw new ApiError(500, 'JWT Secret or Expiry is not defined');

  return jwt.sign({ id, role }, secret, getJwtOptions(expires));
};

const createRefreshToken = async (userId: string): Promise<string> => {
  const token = crypto.randomBytes(40).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 Days

  // FIX: Convert string userId to Types.ObjectId to match Schema expectation
  await RefreshTokenModel.create({ 
    userId: new Types.ObjectId(userId), 
    token, 
    expiresAt 
  });
  return token;
};

export const loginUser = async ({ username, password }: { username: string; password: string }) => {
  // We select +password explicitly to check it
  const user = await UserModel.findOne({ username }).select('+password');

  // FIX: Ensure user exists and user.password is defined before comparing
  if (!user || !user.password || !(await bcryptjs.compare(password, user.password))) {
    throw new ApiError(401, 'Incorrect username or password');
  }

  const accessToken = signAccessToken(user._id.toString(), user.role);
  const refreshToken = await createRefreshToken(user._id.toString());

  return { accessToken, refreshToken, role: user.role, name: user.name };
};

export const refreshAccessToken = async (refreshToken: string) => {
  // FIX: We need to cast the populated userId to get access to its properties
  const storedToken = await RefreshTokenModel.findOne({ token: refreshToken }).populate<{ userId: IUser }>('userId');
  
  if (!storedToken || storedToken.expiresAt < new Date()) {
    if (storedToken) await storedToken.deleteOne();
    throw new ApiError(403, 'Refresh token expired or invalid');
  }

  const user = storedToken.userId;
  const newAccessToken = signAccessToken(user._id.toString(), user.role);

  return { accessToken: newAccessToken };
};

export const registerUser = async (userData: Partial<IUser>) => {
  const existingUser = await UserModel.findOne({ username: userData.username });
  if (existingUser) throw new ApiError(400, 'Username already exists');

  const user = await UserModel.create(userData);
  // we return a plain object without the password
  const userObj = user.toObject();
  delete userObj.password;

  return { 
    user: userObj, 
    token: signToken(user._id.toString(), user.role) 
  };
};