import { JobStatus } from './job.model';
import { Rating, ReviewSummary } from './review.model';
import { PublicJob } from './search.model';

export type ApplicationStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'completed';

/** Phone / LINE of the other side; only sent by the API once the application is accepted or completed */
export interface Contact {
  phone: string | null;
  lineId: string | null;
}

interface ApplicationBase {
  id: number;
  status: ApplicationStatus;
  appliedAt: string;
  decidedAt: string | null;
  cancelledAt: string | null;
  completedAt: string | null;
  contact: Contact | null;
  /** completedAt + 14 days */
  reviewDeadline: string | null;
  /** Completed and still inside the 14-day review window */
  reviewOpen: boolean;
  /** Detail endpoints only */
  myReview?: ReviewSummary | null;
  theirReview?: ReviewSummary | null;
}

/** Seeker's own application */
export interface MyApplication extends ApplicationBase {
  job: PublicJob;
}

/** Applicant as seen by the shop */
export interface Applicant extends ApplicationBase {
  job: { id: number; title: string; status: JobStatus };
  seeker: {
    id: number;
    fullName: string;
    age: number | null;
    avatarPath: string | null;
    skills: string | null;
    bio?: string | null;
    rating: Rating;
  };
}

export interface ShopDashboard {
  verifyStatus: 'unsubmitted' | 'pending' | 'verified' | 'rejected';
  openJobs: number;
  expiringJobs: number;
  pendingApplicants: number;
  acceptedApplicants: number;
  recentApplicants: Applicant[];
}

export const APPLICATION_STATUS_LABEL: Record<ApplicationStatus, string> = {
  pending: 'รอพิจารณา',
  accepted: 'รับเข้าทำงาน',
  rejected: 'ไม่ผ่าน',
  cancelled: 'ยกเลิกแล้ว',
  completed: 'งานเสร็จแล้ว',
};

export const APPLICATION_STATUS_COLOR: Record<ApplicationStatus, string> = {
  pending: 'warning',
  accepted: 'success',
  rejected: 'danger',
  cancelled: 'medium',
  completed: 'primary',
};
