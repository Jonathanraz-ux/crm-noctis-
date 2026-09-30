import { storageKeys, type RoleKey } from '@/config/product';
import { supabase } from '@/lib/supabase';
import type { Membership, Organization, Profile } from '@/lib/types/database';
import type { Session, User } from '@supabase/supabase-js';
import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useRef, useState } from 'react';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  organizations: Organization[];
  activeOrganizationId: string | null;
  activeOrganization: Organization | null;
  activeMembership: Membership | null;
  role: RoleKey | null;
  roleKey: RoleKey | null;
  permissions: string[];
  hasPermission: (code: string) => boolean;
  can: (code: string) => boolean;
  isLoading: boolean;
  setActiveOrganizationId: (id: string) => void;
  createOrganization: (name: string, timezone?: string) => Promise<string>;
  updateProfile: (updates: {
    full_name?: string | null;
    avatar_url?: string | null;
  }) => Promise<void>;
  refreshUserData: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [activeOrgId, setActiveOrgId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(storageKeys.activeOrg);
  });
  const [activeMembership, setActiveMembership] = useState<Membership | null>(
    null,
  );
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchUserData = async (currentUser: User) => {
    try {
      // 1. Fetch Profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (profileData) {
        setProfile(profileData);
      }

      // 2. Fetch Memberships & Organizations
      const { data: memberRows } = await supabase
        .from('memberships')
        .select('*, organizations(*)')
        .eq('user_id', currentUser.id)
        .eq('status', 'active');

      const orgs: Organization[] = [];
      const memberships: Membership[] = [];

      if (memberRows && Array.isArray(memberRows)) {
        for (const row of memberRows) {
          if (row.organizations && typeof row.organizations === 'object') {
            orgs.push(row.organizations as unknown as Organization);
          }
          memberships.push({
            id: row.id,
            organization_id: row.organization_id,
            user_id: row.user_id,
            email: row.email,
            role_key: row.role_key,
            status: row.status,
            invited_by: row.invited_by,
            created_at: row.created_at,
            updated_at: row.updated_at,
          });
        }
      }

      setOrganizations(orgs);

      // Determine active organization
      let currentOrgId = activeOrgId;
      if (!currentOrgId || !orgs.some((o) => o.id === currentOrgId)) {
        currentOrgId = orgs[0]?.id ?? null;
      }

      setActiveOrgId(currentOrgId);
      if (currentOrgId) {
        localStorage.setItem(storageKeys.activeOrg, currentOrgId);
      } else {
        localStorage.removeItem(storageKeys.activeOrg);
      }

      // Find active membership & fetch permissions
      const activeMember =
        memberships.find((m) => m.organization_id === currentOrgId) ?? null;
      setActiveMembership(activeMember);

      if (activeMember?.role_key) {
        const { data: permRows } = await supabase
          .from('role_permissions')
          .select('permission_code, roles!inner(key)')
          .eq('roles.key', activeMember.role_key);

        if (permRows) {
          setPermissions(permRows.map((p) => p.permission_code));
        } else {
          setPermissions([]);
        }
      } else {
        setPermissions([]);
      }
    } catch (err) {
      console.error('Error fetching user auth data:', err);
    }
  };

  // Read through a ref so the mount-only effect below can call it without
  // re-subscribing. `fetchUserData` closes over `activeOrgId`, so listing it as
  // an effect dependency would tear down and rebuild the auth subscription every
  // time the workspace selection changed — and `onAuthStateChange` fires again
  // on each new subscription.
  const fetchUserDataRef = useRef(fetchUserData);
  fetchUserDataRef.current = fetchUserData;

  useEffect(() => {
    let mounted = true;

    // Initial session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      if (!mounted) return;
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      if (currentSession?.user) {
        fetchUserDataRef.current(currentSession.user).finally(() => {
          if (mounted) setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!mounted) return;
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        await fetchUserDataRef.current(newSession.user);
      } else {
        setProfile(null);
        setOrganizations([]);
        setActiveOrgId(null);
        setActiveMembership(null);
        setPermissions([]);
      }
      setIsLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSetActiveOrgId = (id: string) => {
    setActiveOrgId(id);
    localStorage.setItem(storageKeys.activeOrg, id);
    if (user) {
      fetchUserData(user);
    }
  };

  const createOrganization = async (name: string, timezone = 'UTC') => {
    const { data, error } = await supabase.rpc('create_organization', {
      p_name: name,
      p_timezone: timezone,
    });
    if (error) throw error;
    const newOrgId = data as string;
    if (user) {
      await fetchUserData(user);
    }
    handleSetActiveOrgId(newOrgId);
    return newOrgId;
  };

  const refreshUserData = async () => {
    if (user) {
      await fetchUserData(user);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem(storageKeys.activeOrg);
    setSession(null);
    setUser(null);
    setProfile(null);
    setOrganizations([]);
    setActiveOrgId(null);
    setActiveMembership(null);
    setPermissions([]);
  };

  const hasPermission = (code: string) => {
    return permissions.includes(code);
  };

  const activeOrganization =
    organizations.find((o) => o.id === activeOrgId) ?? organizations[0] ?? null;

  const updateProfile = async (updates: {
    full_name?: string | null;
    avatar_url?: string | null;
  }) => {
    if (!user) throw new Error('Not signed in');
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);
    if (error) throw error;
    await refreshUserData();
  };

  const roleKey = (activeMembership?.role_key as RoleKey) ?? null;

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        organizations,
        activeOrganizationId: activeOrgId,
        activeOrganization,
        activeMembership,
        role: roleKey,
        roleKey,
        permissions,
        hasPermission,
        can: hasPermission,
        isLoading,
        setActiveOrganizationId: handleSetActiveOrgId,
        createOrganization,
        updateProfile,
        refreshUserData,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
