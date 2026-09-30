import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MoreHorizontal, Trash2, UserPlus } from 'lucide-react';

import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/confirm-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Avatar,
  AvatarFallback,
  Badge,
  Label,
  Select,
} from '@/components/ui/primitives';
import { Input } from '@/components/ui/input';
import { RoleBadge } from '@/components/status-badge';
import { useAuth } from '@/providers/AuthProvider';
import { useToast } from '@/providers/ToastProvider';
import {
  useMembers,
  useMemberMutations,
} from '@/features/members/members.hooks';
import { ROLE_KEYS, ROLE_LABELS, type RoleKey } from '@/config/product';
import { formatDate } from '@/lib/format';
import { toErrorMessage } from '@/lib/errors';
import { memberInviteSchema, type MemberInviteInput } from '@/lib/validation';
import type { MemberRow } from '@/lib/types/database';

export function MembersPage() {
  const { can, user } = useAuth();
  const { success, error: toastError } = useToast();
  const { data: members, isLoading, error } = useMembers();
  const { invite, update, remove } = useMemberMutations();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [pendingRemoval, setPendingRemoval] = useState<MemberRow | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MemberInviteInput>({
    resolver: zodResolver(memberInviteSchema),
    defaultValues: { email: '', role_key: 'member' },
  });

  const onInvite = handleSubmit(async (values) => {
    try {
      await invite.mutateAsync({ email: values.email, role: values.role_key });
      success(
        'Invitation recorded',
        `${values.email} joins this workspace on sign up.`,
      );
      reset();
      setInviteOpen(false);
    } catch (caught) {
      toastError('Could not invite', toErrorMessage(caught));
    }
  });

  const onRoleChange = async (member: MemberRow, newRole: RoleKey) => {
    try {
      await update.mutateAsync({
        membershipId: member.id,
        changes: { role_key: newRole, user_id: member.user_id },
      });
      success(
        'Role updated',
        `Member role changed to ${ROLE_LABELS[newRole]}.`,
      );
    } catch (caught) {
      toastError('Could not change role', toErrorMessage(caught));
    }
  };

  const onRemoveConfirm = async () => {
    if (!pendingRemoval) return;
    try {
      await remove.mutateAsync(pendingRemoval.id);
      success('Member removed');
    } catch (caught) {
      toastError('Could not remove member', toErrorMessage(caught));
    } finally {
      setPendingRemoval(null);
    }
  };

  if (!can('members.read')) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Members"
          description="Your role does not include permission to view members."
        />
      </div>
    );
  }

  const rows = members ?? [];

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Members"
        description="Everyone with a membership in this workspace, including invitations."
      >
        {can('members.invite') && (
          <Button
            leftIcon={<UserPlus className="size-4" />}
            onClick={() => setInviteOpen(true)}
          >
            Invite member
          </Button>
        )}
      </PageHeader>

      {error ? (
        <p
          role="alert"
          className="bg-danger-soft text-danger rounded-md px-3 py-2 text-sm"
        >
          {toErrorMessage(error, 'The member list could not be loaded.')}
        </p>
      ) : null}

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="text-foreground-muted p-6 text-center text-sm">
            Loading members...
          </div>
        ) : rows.length === 0 ? (
          <div className="text-foreground-muted p-8 text-center text-sm">
            No members found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-line bg-surface-subtle text-foreground-muted border-b text-xs font-semibold uppercase">
                  <th className="px-4 py-3">Member</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Joined / Invited</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-line divide-y">
                {rows.map((member) => {
                  const initials =
                    member.full_name
                      ?.split(' ')
                      .map((w: string) => w[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2) ??
                    member.email[0]?.toUpperCase() ??
                    '?';

                  const isCurrentUser = member.user_id === user?.id;
                  const canManage = can('members.manage') && !isCurrentUser;

                  return (
                    <tr
                      key={member.id}
                      className="hover:bg-surface-subtle/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="size-8">
                            <AvatarFallback className="text-xs">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-foreground truncate font-medium">
                              {member.full_name || 'No name set'}
                              {isCurrentUser && (
                                <span className="text-primary ml-1.5 text-xs font-normal">
                                  (You)
                                </span>
                              )}
                            </p>
                            <p className="text-foreground-muted truncate text-xs">
                              {member.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <RoleBadge roleKey={member.role_key as RoleKey} />
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            member.status === 'active'
                              ? 'success'
                              : member.status === 'invited'
                                ? 'warning'
                                : 'danger'
                          }
                        >
                          {member.status}
                        </Badge>
                      </td>
                      <td className="text-foreground-muted px-4 py-3 text-xs">
                        {formatDate(member.created_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {canManage ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Member options"
                              >
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {ROLE_KEYS.map((rk) => (
                                <DropdownMenuItem
                                  key={rk}
                                  disabled={member.role_key === rk}
                                  onSelect={() => onRoleChange(member, rk)}
                                >
                                  Change role to {ROLE_LABELS[rk]}
                                </DropdownMenuItem>
                              ))}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-danger"
                                onSelect={() => setPendingRemoval(member)}
                              >
                                <Trash2 className="mr-2 size-4" />
                                Remove member
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : (
                          <span className="text-foreground-muted text-xs">
                            —
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Invite Member Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <form onSubmit={onInvite}>
            <DialogHeader>
              <DialogTitle>Invite a team member</DialogTitle>
              <DialogDescription>
                They will receive an invitation to join this workspace when they
                sign up.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="invite-email">Email address</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="colleague@example.com"
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-danger text-xs">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="invite-role">Role</Label>
                <Select id="invite-role" {...register('role_key')}>
                  {ROLE_KEYS.map((rk) => (
                    <option key={rk} value={rk}>
                      {ROLE_LABELS[rk]}
                    </option>
                  ))}
                </Select>
                {errors.role_key && (
                  <p className="text-danger text-xs">
                    {errors.role_key.message}
                  </p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setInviteOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Inviting...' : 'Send Invitation'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirm Removal Dialog */}
      <ConfirmDialog
        open={Boolean(pendingRemoval)}
        onOpenChange={(open) => !open && setPendingRemoval(null)}
        title="Remove Member"
        description={`Are you sure you want to remove ${pendingRemoval?.email} from this workspace? They will immediately lose access.`}
        confirmLabel="Remove"
        variant="danger"
        onConfirm={onRemoveConfirm}
      />
    </div>
  );
}
