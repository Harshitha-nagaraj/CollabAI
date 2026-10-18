// ─── Backend API Response Types ──────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export type TaskStatus =
  | 'BACKLOG'
  | 'TODO'
  | 'IN_PROGRESS'
  | 'IN_REVIEW'
  | 'DONE'
  | 'CANCELLED';

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type Role = 'OWNER' | 'ADMIN' | 'MEMBER' | 'GUEST';

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  dueDate: string | null;
  projectId: string;
  creatorId: string;
  assigneeId: string | null;
  createdAt: string;
  updatedAt: string;
  creator?: Pick<User, 'id' | 'name' | 'email' | 'avatarUrl'>;
  assignee?: Pick<User, 'id' | 'name' | 'email' | 'avatarUrl'> | null;
  project?: {
    id: string;
    name: string;
    workspaceId: string;
    workspace?: { id: string; name: string };
  };
}

export interface Workspace {
  id: string;
  name: string;
  description: string | null;
  visibility: 'PRIVATE' | 'PUBLIC';
  createdAt: string;
  updatedAt: string;
}

export type ProjectStatus = 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD' | 'CANCELLED';

export interface Project {
  id: string;
  name: string;
  key?: string;
  description: string | null;
  workspaceId: string;
  creatorId: string;
  creator?: Pick<User, 'id' | 'name' | 'email' | 'avatarUrl'>;
  status: ProjectStatus;
  progress?: number;
  teamMembers?: number;
  sprintsCount?: number;
  openIssues?: number;
  totalTasks?: number;
  doneTasks?: number;
  targetDueDate?: string | null;
  isOverdue?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectDetailsResponse {
  project: Project & {
    workspaceName?: string;
    doneTasks?: number;
  };
  tasks: Task[];
  sprints: any[];
  releases: any[];
}

export interface Membership {
  id?: string;
  userId: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
  role: Role;
  joinedAt: string;
}

export interface WorkspaceDetails {
  workspace: Workspace;
  owner: Pick<User, 'id' | 'name' | 'email' | 'avatarUrl'> | null;
  members: Membership[];
  totalMembers: number;
}

export interface KanbanBoard {
  Todo: Task[];
  InProgress: Task[];
  Done: Task[];
}

export type ActivityAction =
  | 'PROJECT_CREATED'
  | 'PROJECT_UPDATED'
  | 'PROJECT_STATUS_CHANGED'
  | 'TASK_CREATED'
  | 'TASK_UPDATED'
  | 'TASK_STATUS_CHANGED'
  | 'TASK_ASSIGNED'
  | 'TASK_REASSIGNED'
  | 'TASK_UNASSIGNED'
  | 'TASK_COMPLETED'
  | 'TASK_DUE_DATE_CHANGED'
  | 'TASK_DELETED';

export type ActivityEntityType = 'PROJECT' | 'TASK';

export interface ProjectActivity {
  id: string;
  projectId: string;
  workspaceId: string;
  actorId: string;
  action: ActivityAction;
  entityType: ActivityEntityType;
  entityId: string;
  entityTitle: string;
  details: Record<string, any> | null;
  createdAt: string;
  actor?: Pick<User, 'id' | 'name' | 'email' | 'avatarUrl'>;
}

export interface ProjectActivitiesResponse {
  activities: ProjectActivity[];
  nextCursor: string | null;
  hasMore: boolean;
  totalCount: number;
}

export interface TaskComment {
  id: string;
  taskId: string;
  authorId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: Pick<User, 'id' | 'name' | 'email' | 'avatarUrl'>;
}

// ─── API Envelope ────────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    message: string;
    statusCode: number;
    details?: { field: string; message: string }[];
  };
}
