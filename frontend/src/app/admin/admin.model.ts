import { ApplicationStatus } from '../shared/models/application.model';
import { PublicJob } from '../shared/models/search.model';
import { Shop, VerifyStatus } from '../shared/models/shop.model';

export interface AdminStats {
  seekers: number;
  shops: number;
  pendingShops: number;
  openJobs: number;
  applications: number;
  openReports: number;
}

export interface AdminShopRow {
  id: number;
  name: string;
  imagePath: string | null;
  verifyStatus: VerifyStatus;
  provinceName: string;
  districtName: string;
  ownerEmail: string;
  ownerStatus: 'active' | 'suspended';
  verifySubmittedAt: string | null;
  createdAt: string;
}

export interface AdminShopDetail extends Shop {
  verifyDocType: 'pdf' | 'jpg' | 'png' | null;
  owner: { id: number; email: string; status: 'active' | 'suspended'; createdAt: string };
  jobCount: number;
  openJobCount: number;
}

export interface AdminLog {
  id: number;
  admin: { id: number; email: string };
  action: string;
  targetType: string;
  targetId: number;
  reason: string | null;
  createdAt: string;
}

export interface AdminLogFilters {
  admins: { id: number; email: string }[];
  actions: string[];
  targetTypes: string[];
}

export const ACTION_LABEL: Record<string, string> = {
  'shop.verify': 'ยืนยันร้าน',
  'shop.reject': 'ปฏิเสธร้าน',
  'user.suspend': 'ระงับบัญชี',
  'user.unsuspend': 'ปลดระงับบัญชี',
  'job.hide': 'ซ่อนประกาศ',
  'job.unhide': 'เลิกซ่อนประกาศ',
  'report.resolve': 'จัดการรายงาน',
  'report.dismiss': 'ยกเลิกรายงาน',
  'review.hide': 'ซ่อนรีวิว',
  'category.create': 'เพิ่มหมวดหมู่',
  'category.update': 'แก้ไขหมวดหมู่',
};

export const TARGET_LABEL: Record<string, string> = {
  shop: 'ร้านค้า',
  user: 'ผู้ใช้',
  job: 'ประกาศ',
  report: 'รายงาน',
  review: 'รีวิว',
  category: 'หมวดหมู่',
};

export interface AdminUserRow {
  id: number;
  email: string;
  role: 'seeker' | 'shop' | 'admin' | null;
  status: 'active' | 'suspended';
  profileCompleted: boolean;
  hasGoogle: boolean;
  displayName: string | null;
  shopId: number | null;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface AdminJobRow extends Omit<PublicJob, 'acceptingApplications'> {
  applicantCount: number;
  openReports: number;
}

export interface AdminJobDetail extends Omit<PublicJob, 'acceptingApplications'> {
  openReports: number;
  applicationCounts: Partial<Record<string, number>>;
}

export interface AdminJobApplicant {
  id: number;
  status: ApplicationStatus;
  appliedAt: string;
  seeker: { id: number; fullName: string; email: string };
}

export interface AdminReport {
  id: number;
  targetType: 'job' | 'review';
  targetId: number;
  reason: string;
  status: 'open' | 'resolved' | 'dismissed';
  createdAt: string;
  resolvedAt: string | null;
  reporterEmail: string;
  resolverEmail: string | null;
  target:
    | { title: string; status: string; shopName: string }
    | { rating: number; comment: string | null; isHidden: boolean; author: string }
    | null;
}

export interface AdminCategory {
  id: number;
  name: string;
  icon: string | null;
  sortOrder: number;
  isActive: boolean;
  jobCount?: number;
}

export const ROLE_LABEL: Record<string, string> = { seeker: 'ผู้หางาน', shop: 'ร้านค้า', admin: 'แอดมิน' };
