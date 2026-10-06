import { Rating } from './review.model';

export type VerifyStatus = 'unsubmitted' | 'pending' | 'verified' | 'rejected';

/** Shop as seen by its owner or an admin (includes private contact details). */
export interface Shop {
  id: number;
  name: string;
  description: string | null;
  address: string;
  provinceId: number;
  districtId: number;
  provinceName: string;
  districtName: string;
  phone: string | null;
  lineId: string | null;
  /** Relative to environment.uploadsUrl */
  imagePath: string | null;
  verifyStatus: VerifyStatus;
  rejectReason: string | null;
  hasVerifyDoc: boolean;
  verifySubmittedAt: string | null;
  verifiedAt: string | null;
  createdAt: string;
  rating: Rating;
}

export const VERIFY_STATUS_LABEL: Record<VerifyStatus, string> = {
  unsubmitted: 'ยังไม่ส่งเอกสาร',
  pending: 'รอตรวจสอบ',
  verified: 'ยืนยันแล้ว',
  rejected: 'ไม่ผ่านการยืนยัน',
};

export const VERIFY_STATUS_COLOR: Record<VerifyStatus, string> = {
  unsubmitted: 'medium',
  pending: 'warning',
  verified: 'success',
  rejected: 'danger',
};
