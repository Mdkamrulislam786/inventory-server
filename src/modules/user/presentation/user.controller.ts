import { Request, Response, NextFunction } from 'express';
import * as UserService from '../application/user.service';
import { ApiError } from '../../../core/errors/api-error';
import { RefreshTokenModel } from '../infrastructure/refresh-token.model';

export const signup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await UserService.registerUser(req.body);
    res.status(201).json({ status: 'success', data });
  } catch (err) { next(err); }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await UserService.loginUser(req.body);
    res.status(200).json({ status: 'success', data });
  } catch (err) { next(err); }
};

export const refresh = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) throw new ApiError(400, 'Refresh token is required');

    const data = await UserService.refreshAccessToken(refreshToken);
    res.status(200).json({ status: 'success', ...data });
  } catch (err) { next(err); }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    await RefreshTokenModel.deleteOne({ token: refreshToken });
    res.status(200).json({ status: 'success', message: 'Logged out successfully' });
  } catch (err) { next(err); }
};