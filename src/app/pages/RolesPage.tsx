import { Fragment } from 'react';

import { Check, Minus, ShieldCheck } from 'lucide-react';

import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/providers/AuthProvider';
import { useRoleCatalog } from '@/features/roles/roles.hooks';
import { ROLE_LABELS, type RoleKey } from '@/config/product';
import { toErrorMessage } from '@/lib/errors';

export function RolesPage() {
  const { roleKey } = useAuth();
  const { data, isLoading, error } = useRoleCatalog();

  if (error) {
    return (
      <div className="animate-fade-in space-y-4">
        <PageHeader
          title="Roles"
          description="Role catalogue and permission matrix."
        />
        <p
          role="alert"
          className="bg-danger-soft text-danger rounded-md px-3 py-2 text-sm"
        >
          {toErrorMessage(error, 'The role catalogue could not be loaded.')}
        </p>
      </div>
    );
  }

  const permissions = data?.permissions ?? [];
  const roles = data?.roles ?? [];
  const byRole = data?.byRole ?? {};

  // Group permissions by category
  const categories = Array.from(
    new Set(permissions.map((p) => p.category)),
  ).sort();

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Roles & Permissions"
        description={`${roles.length} roles and ${permissions.length} permissions defined in the database. A role is a bundle of permissions enforced by Supabase RLS.`}
      />

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="text-foreground-muted p-6 text-center text-sm">
            Loading role catalogue...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[42rem] border-collapse text-sm">
              <thead>
                <tr className="border-line bg-surface-subtle border-b">
                  <th
                    scope="col"
                    className="text-foreground-muted px-4 py-3 text-left text-xs font-semibold tracking-wide uppercase"
                  >
                    Permission
                  </th>
                  {roles.map((role) => (
                    <th
                      key={role.key}
                      scope="col"
                      className="text-foreground-muted px-4 py-3 text-center text-xs font-semibold tracking-wide uppercase"
                    >
                      <span className="flex flex-col items-center gap-0.5">
                        <span>
                          {ROLE_LABELS[role.key as RoleKey] ?? role.name}
                        </span>
                        {role.key === roleKey && (
                          <span className="text-primary flex items-center gap-1 text-[10px] font-medium normal-case">
                            <ShieldCheck className="size-3" aria-hidden />
                            you
                          </span>
                        )}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-line divide-y">
                {categories.map((category) => {
                  const catPerms = permissions.filter(
                    (p) => p.category === category,
                  );
                  return (
                    <Fragment key={category}>
                      <tr className="bg-surface-muted/50">
                        <td
                          colSpan={roles.length + 1}
                          className="text-foreground-muted px-4 py-2 text-xs font-semibold tracking-wider uppercase"
                        >
                          {category}
                        </td>
                      </tr>
                      {catPerms.map((perm) => (
                        <tr
                          key={perm.code}
                          className="hover:bg-surface-subtle/50 transition-colors"
                        >
                          <td className="px-4 py-2.5">
                            <p className="text-foreground text-xs font-medium">
                              {perm.label}
                            </p>
                            <p className="text-foreground-muted font-mono text-[11px]">
                              {perm.code}
                            </p>
                          </td>
                          {roles.map((role) => {
                            const hasIt = byRole[role.key]?.includes(perm.code);
                            return (
                              <td
                                key={role.key}
                                className="px-4 py-2.5 text-center"
                              >
                                {hasIt ? (
                                  <span className="bg-success-soft text-success mx-auto inline-grid size-5 place-items-center rounded-full">
                                    <Check
                                      className="size-3.5 stroke-[2.5]"
                                      aria-hidden
                                    />
                                    <span className="sr-only">Allowed</span>
                                  </span>
                                ) : (
                                  <span className="text-foreground-subtle mx-auto inline-grid size-5 place-items-center">
                                    <Minus className="size-3.5" aria-hidden />
                                    <span className="sr-only">Not allowed</span>
                                  </span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
