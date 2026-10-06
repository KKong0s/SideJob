import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Category } from '../models/job.model';
import { Page, toHttpParams } from '../models/page.model';
import { AreaCounts, AreaSelection, JobFilter, PublicJob } from '../models/search.model';

/** /api/jobs/* (public job data) */
@Injectable({ providedIn: 'root' })
export class JobsService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/jobs`;

  readonly categories = signal<Category[]>([]);
  private loadingCategories: Promise<Category[]> | null = null;

  /** Loaded once per app session */
  loadCategories(): Promise<Category[]> {
    if (this.categories().length) return Promise.resolve(this.categories());
    this.loadingCategories ??= firstValueFrom(this.http.get<{ items: Category[] }>(`${this.api}/categories`))
      .then((res) => {
        this.categories.set(res.items);
        return res.items;
      })
      .finally(() => (this.loadingCategories = null));
    return this.loadingCategories;
  }

  search(area: AreaSelection | null, filter: JobFilter, q: string, page: number, context?: HttpContext): Promise<Page<PublicJob>> {
    const params = toHttpParams({
      provinceId: area?.provinceId,
      districtIds: area?.districtIds,
      categoryId: filter.categoryId,
      wageUnit: filter.wageUnit,
      wageMin: filter.wageMin,
      wageMax: filter.wageMax,
      workDays: filter.workDays,
      q,
      page,
    });
    return firstValueFrom(this.http.get<Page<PublicJob>>(this.api, { params, context }));
  }

  async job(id: number, context?: HttpContext): Promise<PublicJob> {
    const res = await firstValueFrom(this.http.get<{ job: PublicJob }>(`${this.api}/${id}`, { context }));
    return res.job;
  }

  areaCounts(): Promise<AreaCounts> {
    return firstValueFrom(this.http.get<AreaCounts>(`${this.api}/area-counts`));
  }
}
