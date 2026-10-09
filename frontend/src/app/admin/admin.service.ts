import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../environments/environment';
import { Page, QueryParams, toHttpParams } from '../shared/models/page.model';
import {
  AdminCategory,
  AdminJobApplicant,
  AdminJobDetail,
  AdminJobRow,
  AdminLog,
  AdminLogFilters,
  AdminReport,
  AdminShopDetail,
  AdminShopRow,
  AdminStats,
  AdminUserRow,
  DashboardCharts,
} from './admin.model';

/** /api/admin/* */
@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/admin`;

  stats(context?: HttpContext): Promise<AdminStats> {
    return firstValueFrom(this.http.get<AdminStats>(`${this.api}/stats`, { context }));
  }

  charts(days: number, context?: HttpContext): Promise<DashboardCharts> {
    return firstValueFrom(this.http.get<DashboardCharts>(`${this.api}/stats/charts`, { params: { days: String(days) }, context }));
  }

  shops(params: QueryParams, context?: HttpContext): Promise<Page<AdminShopRow>> {
    return firstValueFrom(this.http.get<Page<AdminShopRow>>(`${this.api}/shops`, { params: toHttpParams(params), context }));
  }

  async shop(id: number, context?: HttpContext): Promise<AdminShopDetail> {
    const res = await firstValueFrom(this.http.get<{ shop: AdminShopDetail }>(`${this.api}/shops/${id}`, { context }));
    return res.shop;
  }

  /** Verification document (private file, needs the admin JWT so it is fetched as a blob) */
  shopDocument(id: number): Promise<Blob> {
    return firstValueFrom(this.http.get(`${this.api}/shops/${id}/document`, { responseType: 'blob' }));
  }

  async verifyShop(id: number): Promise<void> {
    await firstValueFrom(this.http.post(`${this.api}/shops/${id}/verify`, {}));
  }

  async rejectShop(id: number, reason: string): Promise<void> {
    await firstValueFrom(this.http.post(`${this.api}/shops/${id}/reject`, { reason }));
  }

  logs(params: QueryParams, context?: HttpContext): Promise<Page<AdminLog>> {
    return firstValueFrom(this.http.get<Page<AdminLog>>(`${this.api}/logs`, { params: toHttpParams(params), context }));
  }

  logFilters(): Promise<AdminLogFilters> {
    return firstValueFrom(this.http.get<AdminLogFilters>(`${this.api}/logs/filters`));
  }

  // --- Users ---------------------------------------------------------------

  users(params: QueryParams, context?: HttpContext): Promise<Page<AdminUserRow>> {
    return firstValueFrom(this.http.get<Page<AdminUserRow>>(`${this.api}/users`, { params: toHttpParams(params), context }));
  }

  async setUserSuspended(id: number, suspended: boolean, reason: string): Promise<void> {
    await firstValueFrom(this.http.post(`${this.api}/users/${id}/${suspended ? 'suspend' : 'unsuspend'}`, { reason }));
  }

  // --- Jobs ----------------------------------------------------------------

  jobs(params: QueryParams, context?: HttpContext): Promise<Page<AdminJobRow>> {
    return firstValueFrom(this.http.get<Page<AdminJobRow>>(`${this.api}/jobs`, { params: toHttpParams(params), context }));
  }

  async job(id: number, context?: HttpContext): Promise<AdminJobDetail> {
    const res = await firstValueFrom(this.http.get<{ job: AdminJobDetail }>(`${this.api}/jobs/${id}`, { context }));
    return res.job;
  }

  jobApplicants(id: number, page: number, context?: HttpContext): Promise<Page<AdminJobApplicant>> {
    return firstValueFrom(
      this.http.get<Page<AdminJobApplicant>>(`${this.api}/jobs/${id}/applications`, { params: toHttpParams({ page }), context }),
    );
  }

  async setJobHidden(id: number, hidden: boolean, reason: string): Promise<void> {
    await firstValueFrom(this.http.post(`${this.api}/jobs/${id}/${hidden ? 'hide' : 'unhide'}`, { reason }));
  }

  // --- Reports / reviews ---------------------------------------------------

  reports(params: QueryParams, context?: HttpContext): Promise<Page<AdminReport>> {
    return firstValueFrom(this.http.get<Page<AdminReport>>(`${this.api}/reports`, { params: toHttpParams(params), context }));
  }

  async resolveReport(id: number, hideTarget: boolean, reason: string): Promise<void> {
    await firstValueFrom(this.http.post(`${this.api}/reports/${id}/resolve`, { hideTarget, reason }));
  }

  async dismissReport(id: number, reason: string): Promise<void> {
    await firstValueFrom(this.http.post(`${this.api}/reports/${id}/dismiss`, { reason }));
  }

  // --- Categories ----------------------------------------------------------

  async categories(context?: HttpContext): Promise<AdminCategory[]> {
    const res = await firstValueFrom(this.http.get<{ items: AdminCategory[] }>(`${this.api}/categories`, { context }));
    return res.items;
  }

  async saveCategory(category: Omit<AdminCategory, 'id' | 'jobCount'> & { id?: number }): Promise<void> {
    const body = { name: category.name, icon: category.icon, sortOrder: category.sortOrder, isActive: category.isActive };
    if (category.id) await firstValueFrom(this.http.put(`${this.api}/categories/${category.id}`, body));
    else await firstValueFrom(this.http.post(`${this.api}/categories`, body));
  }
}
