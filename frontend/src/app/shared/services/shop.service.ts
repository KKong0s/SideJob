import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Applicant, ShopDashboard } from '../models/application.model';
import { JobImage, JobInput, JobStatus, OwnJob } from '../models/job.model';
import { Page, toHttpParams } from '../models/page.model';
import { ShopProfileInput } from '../models/session.model';
import { Shop } from '../models/shop.model';
import { silentErrors } from '../utils/api-error';

/** /api/shop/* : the logged-in shop owner's own shop */
@Injectable({ providedIn: 'root' })
export class ShopService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/shop`;

  async getProfile(context?: HttpContext): Promise<Shop> {
    const res = await firstValueFrom(this.http.get<{ shop: Shop }>(`${this.api}/profile`, { context }));
    return res.shop;
  }

  async updateProfile(input: ShopProfileInput): Promise<Shop> {
    const res = await firstValueFrom(this.http.put<{ shop: Shop }>(`${this.api}/profile`, input, { context: silentErrors() }));
    return res.shop;
  }

  async uploadImage(file: Blob, name: string): Promise<string> {
    const res = await firstValueFrom(this.http.post<{ imagePath: string }>(`${this.api}/profile/image`, toForm(file, name)));
    return res.imagePath;
  }

  async uploadVerification(file: Blob, name: string): Promise<void> {
    await firstValueFrom(this.http.post(`${this.api}/verification`, toForm(file, name)));
  }

  // --- Job posts -----------------------------------------------------------

  jobs(status: JobStatus | 'all', page: number, context?: HttpContext): Promise<Page<OwnJob>> {
    return firstValueFrom(this.http.get<Page<OwnJob>>(`${this.api}/jobs`, { params: toHttpParams({ status, page }), context }));
  }

  async job(id: number, context?: HttpContext): Promise<OwnJob> {
    const res = await firstValueFrom(this.http.get<{ job: OwnJob }>(`${this.api}/jobs/${id}`, { context }));
    return res.job;
  }

  async createJob(input: JobInput): Promise<OwnJob> {
    const res = await firstValueFrom(this.http.post<{ job: OwnJob }>(`${this.api}/jobs`, input, { context: silentErrors() }));
    return res.job;
  }

  async updateJob(id: number, input: JobInput): Promise<OwnJob> {
    const res = await firstValueFrom(
      this.http.put<{ job: OwnJob }>(`${this.api}/jobs/${id}`, input, { context: silentErrors() }),
    );
    return res.job;
  }

  /** Returns how many pending applications were rejected automatically */
  async closeJob(id: number): Promise<number> {
    const res = await firstValueFrom(this.http.post<{ rejectedApplications: number }>(`${this.api}/jobs/${id}/close`, {}));
    return res.rejectedApplications;
  }

  async renewJob(id: number): Promise<string> {
    const res = await firstValueFrom(this.http.post<{ expiresOn: string }>(`${this.api}/jobs/${id}/renew`, {}));
    return res.expiresOn;
  }

  async addJobImage(jobId: number, file: File): Promise<JobImage> {
    const res = await firstValueFrom(this.http.post<{ image: JobImage }>(`${this.api}/jobs/${jobId}/images`, toForm(file, file.name)));
    return res.image;
  }

  async deleteJobImage(jobId: number, imageId: number): Promise<void> {
    await firstValueFrom(this.http.delete(`${this.api}/jobs/${jobId}/images/${imageId}`));
  }

  // --- Applicants ----------------------------------------------------------

  dashboard(context?: HttpContext): Promise<ShopDashboard> {
    return firstValueFrom(this.http.get<ShopDashboard>(`${this.api}/dashboard`, { context }));
  }

  applications(params: { status: string; jobId: number | null; page: number }, context?: HttpContext): Promise<Page<Applicant>> {
    return firstValueFrom(this.http.get<Page<Applicant>>(`${this.api}/applications`, { params: toHttpParams(params), context }));
  }

  async application(id: number, context?: HttpContext): Promise<Applicant> {
    const res = await firstValueFrom(this.http.get<{ application: Applicant }>(`${this.api}/applications/${id}`, { context }));
    return res.application;
  }

  async accept(id: number): Promise<void> {
    await firstValueFrom(this.http.post(`${this.api}/applications/${id}/accept`, {}));
  }

  async reject(id: number): Promise<void> {
    await firstValueFrom(this.http.post(`${this.api}/applications/${id}/reject`, {}));
  }
}

function toForm(file: Blob, name: string): FormData {
  const form = new FormData();
  form.append('file', file, name);
  return form;
}
