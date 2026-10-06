/** Average of visible reviews received (average null when there are none) */
export interface Rating {
  average: number | null;
  count: number;
}

export interface ReviewSummary {
  rating: number;
  comment: string | null;
  createdAt: string;
}

/** Review in a list of reviews received by a shop or a seeker */
export interface Review extends ReviewSummary {
  id: number;
  reviewerName: string;
  jobTitle: string;
}

export interface ReviewInput {
  rating: number;
  comment?: string;
}
