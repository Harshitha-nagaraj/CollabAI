import { prisma } from '../lib/prisma.js';
import { CreateWorkspaceInput } from '../validators/workspace.validator.js';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../utils/errors.js';
import { Role, Workspace } from '@prisma/client';

export class WorkspaceService {
  /**
   * Creates a new workspace and sets the creator as the OWNER membership.
   */
  public static async createWorkspace(
    userId: string,
    input: CreateWorkspaceInput
  ): Promise<Workspace> {
    return prisma.$transaction(async (tx) => {
      // Create workspace
      const workspace = await tx.workspace.create({
        data: {
          name: input.name,
          description: input.description ?? null,
        },
      });

      // Create membership as OWNER
      await tx.membership.create({
        data: {
          userId,
          workspaceId: workspace.id,
          role: Role.OWNER,
        },
      });

      return workspace;
    });
  }

  /**
   * Lists all workspaces where the user is a member.
   */
  public static async listWorkspaces(userId: string): Promise<Workspace[]> {
    return prisma.workspace.findMany({
      where: {
        memberships: {
          some: {
            userId,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Retrieves full details of a workspace, including owner, members, and count.
   */
  public static async getWorkspaceDetails(workspaceId: string, userId: string) {
    // Check if user is a member of this workspace
    const userMembership = await prisma.membership.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId,
        },
      },
    });

    if (!userMembership) {
      throw new ForbiddenError('You do not have access to this workspace');
    }

    // Retrieve workspace with memberships
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        memberships: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    if (!workspace) {
      throw new NotFoundError('Workspace not found');
    }

    // Process members and owner
    const members = workspace.memberships.map((m) => ({
      userId: m.user.id,
      name: m.user.name,
      email: m.user.email,
      avatarUrl: m.user.avatarUrl,
      role: m.role,
      joinedAt: m.createdAt,
    }));

    const ownerMembership = workspace.memberships.find((m) => m.role === Role.OWNER);
    const owner = ownerMembership
      ? {
          userId: ownerMembership.user.id,
          name: ownerMembership.user.name,
          email: ownerMembership.user.email,
          avatarUrl: ownerMembership.user.avatarUrl,
        }
      : null;

    // Destructure workspace to omit relationships in raw format
    const { memberships, ...workspaceInfo } = workspace;

    return {
      workspace: workspaceInfo,
      owner,
      members,
      totalMembers: members.length,
    };
  }

  /**
   * Invites (adds) a user to the workspace by email.
   */
  public static async inviteMember(
    workspaceId: string,
    inviteeEmail: string,
    requesterId: string,
    role?: Role
  ): Promise<any> {
    // 1. Confirm workspace exists and requester is an OWNER or ADMIN
    const requesterMembership = await prisma.membership.findUnique({
      where: {
        userId_workspaceId: {
          userId: requesterId,
          workspaceId,
        },
      },
    });

    if (!requesterMembership || (requesterMembership.role !== Role.OWNER && requesterMembership.role !== Role.ADMIN)) {
      throw new ForbiddenError('Only workspace Owners and Admins can invite new members');
    }

    // 2. Find invitee user
    const invitee = await prisma.user.findUnique({
      where: { email: inviteeEmail.toLowerCase().trim() },
    });

    if (!invitee) {
      throw new NotFoundError(`User with email '${inviteeEmail}' is not registered in CollabAI.`);
    }

    // 3. Check for existing membership
    const existingMembership = await prisma.membership.findUnique({
      where: {
        userId_workspaceId: {
          userId: invitee.id,
          workspaceId,
        },
      },
    });

    if (existingMembership) {
      throw new ConflictError('User is already a member of this workspace');
    }

    // 4. Create membership
    const assignedRole = role && Object.values(Role).includes(role) ? role : Role.MEMBER;

    const membership = await prisma.membership.create({
      data: {
        userId: invitee.id,
        workspaceId,
        role: assignedRole,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    return {
      userId: membership.user.id,
      name: membership.user.name,
      email: membership.user.email,
      role: membership.role,
      joinedAt: membership.createdAt,
    };
  }

  /**
   * Removes a member from the workspace. Only owner can execute.
   */
  public static async removeMember(
    workspaceId: string,
    memberToRemoveId: string,
    requesterId: string
  ): Promise<void> {
    // 1. Verify requester is the OWNER of the workspace
    const requesterMembership = await prisma.membership.findUnique({
      where: {
        userId_workspaceId: {
          userId: requesterId,
          workspaceId,
        },
      },
    });

    if (!requesterMembership || requesterMembership.role !== Role.OWNER) {
      throw new ForbiddenError('Only the workspace owner can remove members');
    }

    // 2. Prevent owner from removing themselves
    if (memberToRemoveId === requesterId) {
      throw new BadRequestError('Workspace owner cannot remove themselves');
    }

    // 3. Find the membership to remove
    const membershipToRemove = await prisma.membership.findUnique({
      where: {
        userId_workspaceId: {
          userId: memberToRemoveId,
          workspaceId,
        },
      },
    });

    if (!membershipToRemove) {
      throw new NotFoundError('User is not a member of this workspace');
    }

    // 4. Delete the membership
    await prisma.membership.delete({
      where: {
        userId_workspaceId: {
          userId: memberToRemoveId,
          workspaceId,
        },
      },
    });
  }
}
