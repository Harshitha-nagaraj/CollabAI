import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service.js';

export class AuthController {
  /**
   * POST /api/v1/auth/register
   */
  public static async register(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { user, token } = await AuthService.registerUser(req.body);
      
      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: { user, token },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/auth/login
   */
  public static async login(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { user, token } = await AuthService.loginUser(req.body);

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: { user, token },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/auth/me
   */
  public static async getMe(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // req.user is guaranteed to be set by the requireAuth middleware
      const userId = req.user!.id;
      const user = await AuthService.getCurrentUser(userId);

      res.status(200).json({
        success: true,
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  }
}
