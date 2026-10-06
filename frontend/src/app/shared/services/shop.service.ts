import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
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
}

function toForm(file: Blob, name: string): FormData {
  const form = new FormData();
  form.append('file', file, name);
  return form;
}
