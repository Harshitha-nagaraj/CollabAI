import { Request, Response, NextFunction } from 'express';
import { WorkspaceService } from '../services/workspace.service.js';
import { WorkspaceIdParamSchema, RemoveMemberParamSchema } from '../validators/workspace.validator.js';

export class WorkspaceController {
  /**
   * POST /api/v1/workspaces
   */
  public static async create(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.id;
      const workspace = await WorkspaceService.createWorkspace(userId, req.body);

      res.status(201).json({
        success: true,
        message: 'Workspace created successfully',
        data: { workspace },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/workspaces
   */
  public static async list(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.id;
      const workspaces = await WorkspaceService.listWorkspaces(userId);

      res.status(200).json({
        success: true,
        data: { workspaces },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/workspaces/:workspaceId
   */
  public static async getDetails(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // Validate workspaceId param
      const { workspaceId } = await WorkspaceIdParamSchema.parseAsync(req.params);
      const userId = req.user!.id;
      const details = await WorkspaceService.getWorkspaceDetails(workspaceId, userId);

      res.status(200).json({
        success: true,
        data: details,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/workspaces/:workspaceId/members
   */
  public static async invite(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { workspaceId } = await WorkspaceIdParamSchema.parseAsync(req.params);
      const requesterId = req.user!.id;
      const { email, role } = req.body;

      const member = await WorkspaceService.inviteMember(workspaceId, email, requesterId, role);

      res.status(200).json({
        success: true,
        message: 'Member added to workspace successfully',
        data: { member },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/workspaces/:workspaceId/members/:userId
   */
  public static async remove(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { workspaceId, userId } = await RemoveMemberParamSchema.parseAsync(req.params);
      const requesterId = req.user!.id;

      await WorkspaceService.removeMember(workspaceId, userId, requesterId);

      res.status(200).json({
        success: true,
        message: 'Member removed from workspace successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}
