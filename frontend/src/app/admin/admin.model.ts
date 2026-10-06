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
};

export const TARGET_LABEL: Record<string, string> = {
  shop: 'ร้านค้า',
  user: 'ผู้ใช้',
  job: 'ประกาศ',
  report: 'รายงาน',
  review: 'รีวิว',
  category: 'หมวดหมู่',
};
