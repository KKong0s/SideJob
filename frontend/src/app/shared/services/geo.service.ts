import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Preferences } from '@capacitor/preferences';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';

export interface Region { id: number; nameTh: string; nameEn: string }
export interface Province { id: number; regionId: number; nameTh: string; nameEn: string }
export interface District { id: number; provinceId: number; nameTh: string; nameEn: string }

interface GeoData {
  regions: Region[];
  provinces: Province[];
  districts: District[];
}

// Bump when the geo dataset changes so clients drop their old copy
const CACHE_KEY = 'sidejob.geo.v1';
export const BANGKOK_ID = 1;

/** Provinces / districts, loaded once from the API and cached on the device. */
@Injectable({ providedIn: 'root' })
export class GeoService {
  private readonly http = inject(HttpClient);
  private readonly data = signal<GeoData | null>(null);
  private loading: Promise<GeoData> | null = null;

  readonly regions = () => this.data()?.regions ?? [];

  /** Bangkok first, then Thai alphabetical order. */
  readonly provinces = () =>
    [...(this.data()?.provinces ?? [])].sort((a, b) =>
      a.id === BANGKOK_ID ? -1 : b.id === BANGKOK_ID ? 1 : a.nameTh.localeCompare(b.nameTh, 'th'),
    );

  districtsOf(provinceId: number | null): District[] {
    if (!provinceId) return [];
    return (this.data()?.districts ?? [])
      .filter((d) => d.provinceId === provinceId)
      .sort((a, b) => a.nameTh.localeCompare(b.nameTh, 'th'));
  }

  provinceName(id: number): string {
    return this.data()?.provinces.find((p) => p.id === id)?.nameTh ?? '';
  }

  districtName(id: number): string {
    return this.data()?.districts.find((d) => d.id === id)?.nameTh ?? '';
  }

  /** Bangkok uses "เขต", other provinces "อำเภอ". */
  districtLabel(provinceId: number | null): string {
    return provinceId === BANGKOK_ID ? 'เขต' : 'อำเภอ';
  }

  load(): Promise<GeoData> {
    const current = this.data();
    if (current) return Promise.resolve(current);
    this.loading ??= this.fetch().finally(() => (this.loading = null));
    return this.loading;
  }

  private async fetch(): Promise<GeoData> {
    const cached = await Preferences.get({ key: CACHE_KEY });
    if (cached.value) {
      try {
        const parsed = JSON.parse(cached.value) as GeoData;
        this.data.set(parsed);
        return parsed;
      } catch {
        await Preferences.remove({ key: CACHE_KEY });
      }
    }
    const fresh = await firstValueFrom(this.http.get<GeoData>(`${environment.apiUrl}/geo`));
    this.data.set(fresh);
    await Preferences.set({ key: CACHE_KEY, value: JSON.stringify(fresh) });
    return fresh;
  }
}
