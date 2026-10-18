import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import authRoutes from './routes/auth.routes.js';
import workspaceRoutes from './routes/workspace.routes.js';
import taskRoutes from './routes/task.routes.js';
import executiveRoutes from './routes/executive.routes.js';
import simulationRoutes from './routes/simulation.routes.js';
import learningRoutes from './routes/learning.routes.js';
import meetingRoutes from './routes/meeting.routes.js';
import knowledgeRoutes from './routes/knowledge.routes.js';
import githubRoutes from './routes/github.routes.js';
import releaseRoutes from './routes/release.routes.js';
import documentRoutes from './routes/document.routes.js';
import sprintRoutes from './routes/sprint.routes.js';
import timelineRoutes from './routes/timeline.routes.js';
import aiRoutes from './routes/ai.routes.js';
import projectRoutes from './routes/project.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import integrationRoutes from './routes/integration.routes.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
app.disable('x-powered-by');

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.get('/health', (_request, response) => response.status(200).json({ status: 'ok' }));

const apiRouter = express.Router();
apiRouter.use('/auth', authRoutes);
apiRouter.use('/workspaces', workspaceRoutes);
apiRouter.use('/projects', projectRoutes);
apiRouter.use('/tasks', taskRoutes);
apiRouter.use('/executive', executiveRoutes);
apiRouter.use('/simulations', simulationRoutes);
apiRouter.use('/learning', learningRoutes);
apiRouter.use('/meetings', meetingRoutes);
apiRouter.use('/knowledge', knowledgeRoutes);
apiRouter.use('/github', githubRoutes);
apiRouter.use('/releases', releaseRoutes);
apiRouter.use('/documents', documentRoutes);
apiRouter.use('/sprints', sprintRoutes);
apiRouter.use('/timeline', timelineRoutes);
apiRouter.use('/ai', aiRoutes);
apiRouter.use('/notifications', notificationRoutes);
apiRouter.use('/integrations', integrationRoutes);

app.use('/api/v1', apiRouter);

app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`🚀 Server ready at http://localhost:${env.PORT}`);
});


