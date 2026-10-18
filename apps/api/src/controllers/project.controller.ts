import { Request, Response, NextFunction } from 'express';
import { ProjectService } from '../services/project.service.js';
import { ActivityService } from '../services/activity.service.js';
import {
  ListProjectsQuerySchema,
  ProjectIdParamSchema,
  CreateProjectSchema,
  UpdateProjectSchema,
  ListProjectActivityQuerySchema,
} from '../validators/project.validator.js';

export class ProjectController {
  /**
   * GET /api/v1/projects?workspaceId=<id>
   */
  public static async list(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.id;
      const query = await ListProjectsQuerySchema.parseAsync(req.query);

      const projects = await ProjectService.listProjects(userId, query);

      res.status(200).json({
        success: true,
        data: { projects },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/projects
   */
  public static async create(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const creatorId = req.user!.id;
      const input = await CreateProjectSchema.parseAsync(req.body);

      const project = await ProjectService.createProject(creatorId, input);

      res.status(201).json({
        success: true,
        message: 'Project created successfully',
        data: { project },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/projects/:id
   */
  public static async getDetails(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id } = await ProjectIdParamSchema.parseAsync(req.params);

      const details = await ProjectService.getProjectDetails(userId, id);

      res.status(200).json({
        success: true,
        data: details,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/projects/:id
   */
  public static async update(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id } = await ProjectIdParamSchema.parseAsync(req.params);
      const input = await UpdateProjectSchema.parseAsync(req.body);

      const project = await ProjectService.updateProject(userId, id, input);

      res.status(200).json({
        success: true,
        message: 'Project updated successfully',
        data: { project },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/projects/:id
   */
  public static async delete(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id } = await ProjectIdParamSchema.parseAsync(req.params);

      await ProjectService.deleteProject(userId, id);

      res.status(200).json({
        success: true,
        message: 'Project deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/projects/:id/activity?cursor=...&limit=20
   */
  public static async listActivity(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id } = await ProjectIdParamSchema.parseAsync(req.params);
      const query = await ListProjectActivityQuerySchema.parseAsync(req.query);

      const result = await ActivityService.listProjectActivities(userId, id, query);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
