'use client';

import React, { useState } from 'react';
import { useWorkspaceDetails, useAddWorkspaceMember, useRemoveWorkspaceMember } from '@/lib/queries/workspaces';
import { useCurrentUser } from '@/lib/queries/auth';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  UserPlus,
  Trash2,
  ShieldCheck,
  Mail,
  User,
  CheckCircle2,
  AlertCircle,
  Shield,
  Info,
  Calendar,
  Lock,
} from 'lucide-react';

interface Props {
  workspaceId: string;
}

export function WorkspaceMembersManagement({ workspaceId }: Props) {
  const { toast } = useToast();
  const { data: userData } = useCurrentUser();
  const { data: wsDetails, isLoading, isError, refetch } = useWorkspaceDetails(workspaceId);

  const addMemberMutation = useAddWorkspaceMember();
  const removeMemberMutation = useRemoveWorkspaceMember();

  // Invite Modal State
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'MEMBER' | 'ADMIN' | 'GUEST'>('MEMBER');
  const [formError, setFormError] = useState<string | null>(null);

  // Remove Modal State
  const [memberToRemove, setMemberToRemove] = useState<{ userId: string; name: string | null; email: string } | null>(null);

  const members = wsDetails?.members || [];
  const owner = wsDetails?.owner;
  const currentUserId = userData?.user?.id;

  // Check role of current logged-in user
  const currentUserMember = members.find((m) => m.userId === currentUserId);
  const isOwner = owner?.id === currentUserId || currentUserMember?.role === 'OWNER';
  const isAdmin = currentUserMember?.role === 'ADMIN';
  const canInvite = isOwner || isAdmin;

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setFormError('Please enter a valid email address.');
      return;
    }

    try {
      await addMemberMutation.mutateAsync({
        workspaceId,
        email: trimmedEmail,
        role,
      });

      toast(`Member '${trimmedEmail}' added to workspace successfully!`, 'success');
      setIsInviteModalOpen(false);
      setEmail('');
      setRole('MEMBER');
      setFormError(null);
    } catch (err: any) {
      const errorMsg = err?.message || 'Failed to add member to workspace';
      setFormError(errorMsg);
      toast(errorMsg, 'error');
    }
  };

  const handleRemoveConfirm = async () => {
    if (!memberToRemove) return;
    try {
      await removeMemberMutation.mutateAsync({
        workspaceId,
        userId: memberToRemove.userId,
      });
      toast(`Removed '${memberToRemove.name || memberToRemove.email}' from workspace.`, 'success');
      setMemberToRemove(null);
    } catch (err: any) {
      toast(err?.message || 'Failed to remove member', 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center rounded-2xl border border-[#E2DCD2] bg-white p-6">
        <div className="flex items-center gap-3 text-xs font-semibold text-[#525B56]">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#1F4D3A] border-t-transparent" />
          Loading workspace team members...
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-[#C93B3B]/20 bg-[#FFF5F5] p-6 text-center">
        <AlertCircle className="mx-auto h-8 w-8 text-[#C93B3B]" />
        <h3 className="mt-2 text-sm font-bold text-[#1C2421]">Failed to load workspace members</h3>
        <p className="mt-1 text-xs text-[#525B56]">Ensure you have access permissions for this workspace.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-4 border-[#E2DCD2]">
          Retry Loading
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Container */}
      <div className="rounded-2xl border border-[#E2DCD2] bg-white p-6 shadow-xs space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#E2DCD2] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1F4D3A]/10 text-[#1F4D3A]">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#1C2421]">Workspace Team Members</h3>
                <span className="rounded-full bg-[#1F4D3A]/10 px-2.5 py-0.5 text-xs font-bold text-[#1F4D3A]">
                  {members.length} {members.length === 1 ? 'Member' : 'Members'}
                </span>
              </div>
              <p className="text-xs text-[#525B56]">
                Invite registered collaborators, manage roles, and review member access privileges.
              </p>
            </div>
          </div>

          {canInvite && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setFormError(null);
                setIsInviteModalOpen(true);
              }}
              className="gap-1.5 bg-[#1F4D3A] text-xs font-semibold text-white hover:bg-[#163E32] self-start sm:self-auto"
            >
              <UserPlus className="h-4 w-4" />
              Invite Member
            </Button>
          )}
        </div>

        {/* Permission Info Banner */}
        <div className="flex items-center gap-2.5 rounded-xl border border-[#E2DCD2] bg-[#F7F5F0] p-3 text-xs text-[#525B56]">
          <Info className="h-4 w-4 shrink-0 text-[#1F4D3A]" />
          <span>
            {isOwner
              ? 'As Workspace Owner, you can invite new members and remove existing team members.'
              : isAdmin
              ? 'As Workspace Admin, you can invite new members to this workspace.'
              : 'You are viewing member access details. Workspace Owners and Admins can invite new members.'}
          </span>
        </div>

        {/* Members List Table */}
        <div className="overflow-x-auto rounded-xl border border-[#E2DCD2] bg-white">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E2DCD2] bg-[#F7F5F0] text-[#525B56]">
                <th className="py-3 px-4 font-bold uppercase tracking-wider">User / Email</th>
                <th className="py-3 px-3 font-bold uppercase tracking-wider">Role</th>
                <th className="py-3 px-3 font-bold uppercase tracking-wider">Status</th>
                <th className="py-3 px-3 font-bold uppercase tracking-wider">Joined Date</th>
                <th className="py-3 px-4 font-bold uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2DCD2]">
              {members.map((m) => {
                const isMemberOwner = m.role === 'OWNER';
                const isCurrentUserRow = m.userId === currentUserId;

                return (
                  <tr key={m.userId} className="hover:bg-[#F7F5F0]/50 transition-colors">
                    {/* User Info Column */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1F4D3A]/10 text-xs font-bold text-[#1F4D3A]">
                          {(m.name?.[0] || m.email[0]).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 font-semibold text-[#1C2421]">
                            <span>{m.name || m.email.split('@')[0]}</span>
                            {isCurrentUserRow && (
                              <span className="rounded bg-[#F0EEE6] px-1.5 py-0.2 text-[10px] font-bold text-[#525B56]">
                                You
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-[#525B56] flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {m.email}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Role Column */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      {isMemberOwner ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-[#1F4D3A] px-2 py-0.5 text-[11px] font-bold text-white shadow-xs">
                          <ShieldCheck className="h-3 w-3" />
                          Workspace Owner
                        </span>
                      ) : m.role === 'ADMIN' ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-[#C89B3C]/15 px-2 py-0.5 text-[11px] font-bold text-[#9E731D] border border-[#C89B3C]/30">
                          <Shield className="h-3 w-3" />
                          Admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md bg-[#F0EEE6] px-2 py-0.5 text-[11px] font-semibold text-[#525B56] border border-[#E2DCD2]">
                          Member
                        </span>
                      )}
                    </td>

                    {/* Status Column */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1F4D3A]">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Active Member
                      </span>
                    </td>

                    {/* Joined Date Column */}
                    <td className="py-3 px-3 whitespace-nowrap text-[#525B56] text-xs">
                      {m.joinedAt
                        ? new Date(m.joinedAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : 'Active'}
                    </td>

                    {/* Actions Column */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {isMemberOwner ? (
                        <span className="text-[10px] text-[#525B56] italic">Primary Owner</span>
                      ) : isOwner ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setMemberToRemove({ userId: m.userId, name: m.name, email: m.email })}
                          className="h-7 px-2 text-[#C93B3B] hover:bg-[#FFF2F2] hover:text-[#C93B3B] gap-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Remove
                        </Button>
                      ) : (
                        <span className="text-[10px] text-[#525B56]/70 flex items-center justify-end gap-1" title="Only owner can remove members">
                          <Lock className="h-3 w-3" /> Owner only
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Member Modal */}
      <Modal open={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} title="Invite Team Member" maxWidth="max-w-md">
        <form onSubmit={handleInviteSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-[#1C2421] mb-1">Collaborator Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-[#525B56]" />
              <input
                type="email"
                required
                placeholder="colleague@company.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setFormError(null);
                }}
                className="w-full rounded-lg border border-[#E2DCD2] bg-white pl-9 pr-3.5 py-2 text-xs text-[#1C2421] focus:border-[#1F4D3A] focus:outline-none"
              />
            </div>
            <p className="mt-1 text-[11px] text-[#525B56]">
              Note: Member must be a registered user in CollabAI to be added immediately to this workspace.
            </p>
          </div>

          <div>
            <label className="block font-semibold text-[#1C2421] mb-1">Workspace Member Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              className="w-full rounded-lg border border-[#E2DCD2] bg-white px-3 py-2 text-xs text-[#1C2421] focus:border-[#1F4D3A] focus:outline-none"
            >
              <option value="MEMBER">Member — Can view & manage tasks/projects</option>
              <option value="ADMIN">Admin — Full workspace administrative access</option>
              <option value="GUEST">Guest — Read-only contributor</option>
            </select>
          </div>

          {formError && (
            <div className="flex items-center gap-2 rounded-lg border border-[#C93B3B]/30 bg-[#FFF5F5] p-3 text-xs text-[#C93B3B]">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-[#E2DCD2]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsInviteModalOpen(false)}
              className="border-[#E2DCD2]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={addMemberMutation.isPending}
              className="bg-[#1F4D3A] text-white hover:bg-[#163E32]"
            >
              Add Member
            </Button>
          </div>
        </form>
      </Modal>

      {/* Remove Member Confirmation Modal */}
      <Modal open={!!memberToRemove} onClose={() => setMemberToRemove(null)} title="Remove Member" maxWidth="max-w-sm">
        <div className="space-y-4 text-xs">
          <p className="text-[#1C2421] leading-relaxed">
            Are you sure you want to remove{' '}
            <span className="font-bold">{memberToRemove?.name || memberToRemove?.email}</span> from this workspace? They will lose access to all projects, tasks, and meeting history.
          </p>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E2DCD2]">
            <Button variant="outline" size="sm" onClick={() => setMemberToRemove(null)} className="border-[#E2DCD2]">
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleRemoveConfirm}
              loading={removeMemberMutation.isPending}
              className="bg-[#C93B3B] text-white hover:bg-[#A82B2B]"
            >
              Remove Member
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
