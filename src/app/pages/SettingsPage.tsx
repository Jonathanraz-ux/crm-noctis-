import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { Building2, LogOut, User as UserIcon } from 'lucide-react';

import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Label,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
} from '@/components/ui/primitives';
import { useAuth } from '@/providers/AuthProvider';
import { useToast } from '@/providers/ToastProvider';
import { updateOrganization } from '@/features/organizations/organizations.service';
import {
  ORG_ADMIN_ROLES,
  ROLE_KEYS,
  ROLE_LABELS,
  type RoleKey,
} from '@/config/product';
import { toErrorMessage } from '@/lib/errors';
import { profileSchema, type ProfileValues } from '@/lib/validation';

export function SettingsPage() {
  const {
    profile,
    user,
    activeOrganization,
    roleKey,
    updateProfile,
    signOut,
    can,
  } = useAuth();
  const { success, error: toastError } = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const [orgName, setOrgName] = useState(activeOrganization?.name ?? '');
  const [orgTimezone, setOrgTimezone] = useState(
    activeOrganization?.timezone ?? 'UTC',
  );
  const [savingOrg, setSavingOrg] = useState(false);

  useEffect(() => {
    if (activeOrganization) {
      setOrgName(activeOrganization.name);
      setOrgTimezone(activeOrganization.timezone || 'UTC');
    }
  }, [activeOrganization]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    reset,
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: profile?.full_name ?? '',
      avatarUrl: profile?.avatar_url ?? '',
    },
  });

  useEffect(() => {
    if (profile) {
      reset({
        fullName: profile.full_name ?? '',
        avatarUrl: profile.avatar_url ?? '',
      });
    }
  }, [profile, reset]);

  const onSaveProfile = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await updateProfile({
        full_name: values.fullName?.trim() || null,
        avatar_url: values.avatarUrl?.trim() || null,
      });
      success('Profile updated');
    } catch (caught) {
      const msg = toErrorMessage(caught, 'Could not save your profile.');
      setFormError(msg);
      toastError('Update failed', msg);
    }
  });

  const canEditOrg =
    can('org.manage') &&
    roleKey !== null &&
    ORG_ADMIN_ROLES.includes(roleKey as RoleKey);

  const initials =
    profile?.full_name
      ?.split(' ')
      .map((w: string) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) ??
    user?.email?.[0]?.toUpperCase() ??
    '?';

  return (
    <div className="animate-fade-in mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your account profile and current workspace settings."
      />

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserIcon className="size-4" aria-hidden />
            Personal Profile
          </CardTitle>
          <CardDescription>
            Visible to your team members across this workspace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSaveProfile} noValidate className="space-y-4">
            {formError && (
              <p
                role="alert"
                className="bg-danger-soft text-danger rounded-md px-3 py-2 text-sm"
              >
                {formError}
              </p>
            )}

            <div className="mb-4 flex items-center gap-4">
              <Avatar className="size-12">
                {profile?.avatar_url && (
                  <AvatarImage src={profile.avatar_url} />
                )}
                <AvatarFallback className="text-sm font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-foreground truncate font-medium">
                  {profile?.full_name ?? 'No name set'}
                </p>
                <p className="text-foreground-muted truncate text-xs">
                  {user?.email}
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                {...register('fullName')}
                placeholder="Jane Doe"
                autoComplete="name"
              />
              {errors.fullName && (
                <p className="text-danger text-xs">{errors.fullName.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="avatarUrl">Avatar URL</Label>
              <Input
                id="avatarUrl"
                type="url"
                {...register('avatarUrl')}
                placeholder="https://example.com/photo.jpg"
              />
              {errors.avatarUrl && (
                <p className="text-danger text-xs">
                  {errors.avatarUrl.message}
                </p>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" loading={isSubmitting} disabled={!isDirty}>
                Save Profile
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Workspace Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="size-4" aria-hidden />
            Workspace Details
          </CardTitle>
          <CardDescription>
            {activeOrganization?.name ?? 'No workspace selected'} · your role is{' '}
            {roleKey ? (ROLE_LABELS[roleKey as RoleKey] ?? roleKey) : 'unknown'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {canEditOrg ? (
            <form
              className="space-y-4"
              onSubmit={async (event) => {
                event.preventDefault();
                if (!activeOrganization) return;
                setSavingOrg(true);
                try {
                  await updateOrganization(activeOrganization.id, {
                    name: orgName.trim(),
                    timezone: orgTimezone,
                  });
                  success('Workspace updated');
                } catch (caught) {
                  toastError('Could not update', toErrorMessage(caught));
                } finally {
                  setSavingOrg(false);
                }
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="org-name">Workspace name</Label>
                <Input
                  id="org-name"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="org-timezone">Timezone</Label>
                <Input
                  id="org-timezone"
                  value={orgTimezone}
                  onChange={(e) => setOrgTimezone(e.target.value)}
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" loading={savingOrg}>
                  Save Workspace
                </Button>
              </div>
            </form>
          ) : (
            <p className="text-foreground-muted text-sm">
              Only an owner or administrator can modify workspace settings.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Roles in this workspace */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Roles in this Kit</CardTitle>
          <CardDescription>
            The five standard roles shipped with Noctis CRM schema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-line divide-y">
            {ROLE_KEYS.map((key) => (
              <li
                key={key}
                className="flex items-center justify-between py-2.5 text-sm"
              >
                <span
                  className={
                    key === roleKey
                      ? 'text-foreground font-medium'
                      : 'text-foreground-muted'
                  }
                >
                  {ROLE_LABELS[key]}
                </span>
                {key === roleKey && <Badge variant="default">Your role</Badge>}
              </li>
            ))}
          </ul>
          {can('members.read') && (
            <div className="mt-3">
              <Link
                to="/roles"
                className="text-primary text-xs font-medium hover:underline"
              >
                View full permission matrix &rarr;
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Session Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Session</CardTitle>
          <CardDescription>
            Sign out of your account on this device.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="secondary"
            leftIcon={<LogOut className="size-4" />}
            onClick={() => void signOut()}
          >
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
