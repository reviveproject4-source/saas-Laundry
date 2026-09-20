import { UserRole, UserProfile } from './types';

export interface AuthorizedAccount {
  email: string;
  name: string;
  role: UserRole;
  pin: string;
}

// 4 Akun Resmi Pengguna Internal SaaS Keuangan Laundry
export const AUTHORIZED_ACCOUNTS: AuthorizedAccount[] = [
  {
    email: 'investor1@gmail.com',
    name: 'Investor 1 (Utama)',
    role: 'investor',
    pin: '1234',
  },
  {
    email: 'investor2@gmail.com',
    name: 'Investor 2 (Pendamping)',
    role: 'investor',
    pin: '1234',
  },
  {
    email: 'pengelola1@gmail.com',
    name: 'Pengelola 1 (Shift Pagi)',
    role: 'pengelola',
    pin: '1234',
  },
  {
    email: 'pengelola2@gmail.com',
    name: 'Pengelola 2 (Shift Sore)',
    role: 'pengelola',
    pin: '1234',
  },
];

export function validateLogin(email: string, pin: string): { success: boolean; user?: UserProfile; message?: string } {
  const cleanEmail = email.trim().toLowerCase();
  const found = AUTHORIZED_ACCOUNTS.find((acc) => acc.email.toLowerCase() === cleanEmail);

  if (!found) {
    return {
      success: false,
      message: 'Akses Ditolak. Email tidak terdaftar dalam 4 pengguna internal SaaS.',
    };
  }

  if (pin !== found.pin) {
    return {
      success: false,
      message: 'Password / PIN salah. (Default PIN: 1234)',
    };
  }

  const userProfile: UserProfile = {
    id: `user-${found.email}`,
    name: found.name,
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
