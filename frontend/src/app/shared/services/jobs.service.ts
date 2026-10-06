import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Category } from '../models/job.model';

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
}
