import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { MyApplication } from '../models/application.model';
import { Page, toHttpParams } from '../models/page.model';
import { JobStatusForSeeker, SavedJob, SeekerProfile } from '../models/search.model';

/** /api/seeker/* : the logged-in seeker's own data */
@Injectable({ providedIn: 'root' })
export class SeekerService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/seeker`;

  async profile(context?: HttpContext): Promise<SeekerProfile> {
    const res = await firstValueFrom(this.http.get<{ profile: SeekerProfile }>(`${this.api}/profile`, { context }));
    return res.profile;
  }

  savedJobs(page: number, context?: HttpContext): Promise<Page<SavedJob>> {
    return firstValueFrom(this.http.get<Page<SavedJob>>(`${this.api}/saved-jobs`, { params: toHttpParams({ page }), context }));
  }

  async save(jobId: number): Promise<void> {
    await firstValueFrom(this.http.put(`${this.api}/saved-jobs/${jobId}`, {}));
  }

  async unsave(jobId: number): Promise<void> {
    await firstValueFrom(this.http.delete(`${this.api}/saved-jobs/${jobId}`));
  }

  jobStatus(jobId: number, context?: HttpContext): Promise<JobStatusForSeeker> {
    return firstValueFrom(this.http.get<JobStatusForSeeker>(`${this.api}/jobs/${jobId}/status`, { context }));
  }

  // --- Applications --------------------------------------------------------

  async apply(jobId: number): Promise<number> {
    const res = await firstValueFrom(this.http.post<{ application: { id: number } }>(`${this.api}/jobs/${jobId}/apply`, {}));
    return res.application.id;
  }

  async cancel(applicationId: number): Promise<void> {
    await firstValueFrom(this.http.post(`${this.api}/applications/${applicationId}/cancel`, {}));
  }

  /** status: comma-separated list, e.g. 'pending,accepted' ('' = all) */
  applications(status: string, page: number, context?: HttpContext): Promise<Page<MyApplication>> {
    return firstValueFrom(
      this.http.get<Page<MyApplication>>(`${this.api}/applications`, { params: toHttpParams({ status, page }), context }),
    );
  }

  async application(id: number, context?: HttpContext): Promise<MyApplication> {
    const res = await firstValueFrom(this.http.get<{ application: MyApplication }>(`${this.api}/applications/${id}`, { context }));
    return res.application;
  }
}
