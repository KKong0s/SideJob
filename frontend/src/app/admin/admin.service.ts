import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../environments/environment';
import { Page, QueryParams, toHttpParams } from '../shared/models/page.model';
import { AdminLog, AdminLogFilters, AdminShopDetail, AdminShopRow, AdminStats } from './admin.model';

/** /api/admin/* */
@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/admin`;

  stats(context?: HttpContext): Promise<AdminStats> {
    return firstValueFrom(this.http.get<AdminStats>(`${this.api}/stats`, { context }));
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
}
