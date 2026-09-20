import { UserRole, UserProfile } from './types';

export interface RoleAccount {
  role: UserRole;
  name: string;
  pin: string;
}

// 2 Peran Resmi SaaS Keuangan Trio R Healthy Laundry
export const AUTHORIZED_ROLES: RoleAccount[] = [
  {
    role: 'investor',
    name: 'Investor',
    pin: '1234',
  },
  {
    role: 'pengelola',
    name: 'Pengelola',
    pin: '1234',
  },
];

export function validateRoleLogin(roleInput: UserRole, pin: string): { success: boolean; user?: UserProfile; message?: string } {
  const found = AUTHORIZED_ROLES.find((r) => r.role === roleInput);

  if (!found) {
    return {
      success: false,
      message: 'Peran tidak valid. Silakan pilih Investor atau Pengelola.',
    };
  }

  if (pin !== found.pin) {
    return {
      success: false,
      message: 'Password / PIN salah. (Default PIN: 1234)',
    };
  }

  const userProfile: UserProfile = {
    id: `user-${found.role}`,
    name: found.role === 'investor' ? 'Investor' : 'Pengelola',
    role: found.role,
    tenant_id: 'tenant-1',
  };

  if (typeof window !== 'undefined') {
    localStorage.setItem('laundry_session_user', JSON.stringify(userProfile));
    localStorage.setItem('laundry_active_role', found.role);
  }

  return {
    success: true,
    user: userProfile,
  };
}

export function getCurrentSessionUser(): UserProfile | null {
  if (typeof window === 'undefined') return null;
  const data = localStorage.getItem('laundry_session_user');
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch (e) {
    return null;
  }
}

export function logoutSession() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('laundry_session_user');
    localStorage.removeItem('laundry_active_role');
  }
}
