export type Role = 'seeker' | 'shop' | 'admin';

/** Onboarding order: role -> profile -> terms -> done */
export type OnboardingStep = 'role' | 'profile' | 'terms' | 'done';

export interface SessionUser {
  id: number;
  email: string;
  role: Role | null;
  status: 'active' | 'suspended';
  hasPassword: boolean;
  hasGoogle: boolean;
  profileCompleted: boolean;
  onboardingStep: OnboardingStep;
  displayName: string | null;
  /** Relative to environment.uploadsUrl */
  avatarPath: string | null;
  shop: { id: number; name: string; verifyStatus: 'unsubmitted' | 'pending' | 'verified' | 'rejected' } | null;
}

export interface AuthResponse {
  token: string;
  user: SessionUser;
}

export interface SeekerProfileInput {
  fullName: string;
  birthDate: string;
  phone: string;
  skills?: string;
  bio?: string;
  areas: { provinceId: number; districtId: number | null }[];
}

export interface ShopProfileInput {
  shopName: string;
  address: string;
  provinceId: number;
  districtId: number;
  phone: string;
  description?: string;
}
