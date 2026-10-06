import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Page, toHttpParams } from '../models/page.model';
import { Review, ReviewInput } from '../models/review.model';

export type ReportTarget = 'job' | 'review';

/** Reviews (both sides) and reports */
@Injectable({ providedIn: 'root' })
export class ReviewService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  /** Public reviews of a shop */
  shopReviews(shopId: number, page: number, context?: HttpContext): Promise<Page<Review>> {
    return this.page(`${this.api}/jobs/shops/${shopId}/reviews`, page, context);
  }

  /** Reviews the logged-in seeker received */
  mySeekerReviews(page: number, context?: HttpContext): Promise<Page<Review>> {
    return this.page(`${this.api}/seeker/reviews`, page, context);
  }

  /** Reviews the logged-in shop received */
  myShopReviews(page: number, context?: HttpContext): Promise<Page<Review>> {
    return this.page(`${this.api}/shop/reviews`, page, context);
  }

  /** Reviews an applicant received (shop only, for its own applicants) */
  applicantReviews(seekerUserId: number, page: number, context?: HttpContext): Promise<Page<Review>> {
    return this.page(`${this.api}/shop/seekers/${seekerUserId}/reviews`, page, context);
  }

  async reviewShop(applicationId: number, input: ReviewInput): Promise<void> {
    await firstValueFrom(this.http.post(`${this.api}/seeker/applications/${applicationId}/review`, input));
  }

  async reviewSeeker(applicationId: number, input: ReviewInput): Promise<void> {
    await firstValueFrom(this.http.post(`${this.api}/shop/applications/${applicationId}/review`, input));
  }

  async report(targetType: ReportTarget, targetId: number, reason: string): Promise<void> {
    await firstValueFrom(this.http.post(`${this.api}/reports`, { targetType, targetId, reason }));
  }

  private page(url: string, page: number, context?: HttpContext): Promise<Page<Review>> {
    return firstValueFrom(this.http.get<Page<Review>>(url, { params: toHttpParams({ page }), context }));
  }
}
