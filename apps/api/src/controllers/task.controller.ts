import { Request, Response, NextFunction } from 'express';
import { TaskService } from '../services/task.service.js';
import { ListTasksQuerySchema, CreateTaskCommentSchema } from '../validators/task.validator.js';
import { z } from 'zod';

const TaskIdParamSchema = z.object({
  taskId: z.string().uuid('Invalid task ID format'),
});

const WorkspaceIdParamSchema = z.object({
  workspaceId: z.string().uuid('Invalid workspace ID format'),
});

export class TaskController {
  /**
   * POST /api/v1/tasks
   */
  public static async create(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const creatorId = req.user!.id;
      const task = await TaskService.createTask(creatorId, req.body);

      res.status(201).json({
        success: true,
        message: 'Task created successfully',
        data: { task },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/tasks
   */
  public static async list(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.id;
      const query = await ListTasksQuerySchema.parseAsync(req.query);

      const tasks = await TaskService.listTasks(userId, query);

      res.status(200).json({
        success: true,
        data: { tasks },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/tasks/:taskId
   */
  public static async getDetails(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { taskId } = await TaskIdParamSchema.parseAsync(req.params);
      const userId = req.user!.id;

      const task = await TaskService.getTaskDetails(taskId, userId);

      res.status(200).json({
        success: true,
        data: { task },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/tasks/:taskId
   */
  public static async update(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { taskId } = await TaskIdParamSchema.parseAsync(req.params);
      const userId = req.user!.id;

      const task = await TaskService.updateTask(taskId, userId, req.body);

      res.status(200).json({
        success: true,
        message: 'Task updated successfully',
        data: { task },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/tasks/:taskId
   */
  public static async delete(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { taskId } = await TaskIdParamSchema.parseAsync(req.params);
      const userId = req.user!.id;

      await TaskService.deleteTask(taskId, userId);

      res.status(200).json({
        success: true,
        message: 'Task deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/workspaces/:workspaceId/kanban
   */
  public static async getKanban(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { workspaceId } = await WorkspaceIdParamSchema.parseAsync(req.params);
      const userId = req.user!.id;

      const board = await TaskService.getKanbanBoard(workspaceId, userId);

      res.status(200).json({
        success: true,
        data: { board },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/tasks/:taskId/comments
   */
  public static async listComments(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { taskId } = await TaskIdParamSchema.parseAsync(req.params);
      const userId = req.user!.id;

      const comments = await TaskService.listComments(userId, taskId);

      res.status(200).json({
        success: true,
        data: { comments },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/tasks/:taskId/comments
   */
  public static async createComment(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { taskId } = await TaskIdParamSchema.parseAsync(req.params);
      const userId = req.user!.id;
      const { content } = await CreateTaskCommentSchema.parseAsync(req.body);

      const comment = await TaskService.createComment(userId, taskId, content);

      res.status(201).json({
        success: true,
        message: 'Comment created successfully',
        data: { comment },
      });
    } catch (error) {
      next(error);
    }
  }
}
