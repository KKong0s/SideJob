import { Job, WageUnit, Weekday } from './job.model';
import { Rating } from './review.model';

/** Job as seekers see it (search, saved jobs, detail). Never contains shop phone / LINE. */
export interface PublicJob extends Job {
  /** false when closed, expired or the work dates are over */
  acceptingApplications: boolean;
  shop: {
    id: number;
    name: string;
    imagePath: string | null;
    // detail endpoint only
    description?: string | null;
    address?: string;
    provinceId?: number;
    provinceName?: string;
    districtName?: string;
    rating?: Rating;
  };
}

export interface SavedJob extends PublicJob {
  savedAt: string;
}

/** Area chosen in the area picker. provinceId null = whole country; empty districtIds = whole province. */
export interface AreaSelection {
  provinceId: number | null;
  districtIds: number[];
}

export interface AreaCounts {
  total: number;
  provinces: Record<string, number>;
  districts: Record<string, number>;
}

export interface JobFilter {
  categoryId: number | null;
  wageUnit: WageUnit | null;
  wageMin: number | null;
  wageMax: number | null;
  workDays: Weekday[];
}

export const EMPTY_FILTER: JobFilter = { categoryId: null, wageUnit: null, wageMin: null, wageMax: null, workDays: [] };

export interface SeekerArea {
  provinceId: number;
  districtId: number | null;
  provinceName: string;
  districtName: string | null;
}

export interface SeekerProfile {
  fullName: string;
  birthDate: string;
  phone: string | null;
  lineId: string | null;
  skills: string | null;
  bio: string | null;
  avatarPath: string | null;
  rating: Rating;
  areas: SeekerArea[];
}

export interface JobStatusForSeeker {
  saved: boolean;
  application: { id: number; status: string } | null;
}
