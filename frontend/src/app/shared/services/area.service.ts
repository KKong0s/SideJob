import { Injectable, inject, signal } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

import { AreaCounts, AreaSelection } from '../models/search.model';
import { BANGKOK_ID, GeoService } from './geo.service';
import { JobsService } from './jobs.service';

const AREA_KEY = 'sidejob.area.v1';
const PROMPTED_KEY = 'sidejob.areaPrompted.v1';
const COUNTS_TTL_MS = 60_000;

/** The search area the seeker picked last (remembered on the device) and open-job counts per area. */
@Injectable({ providedIn: 'root' })
export class AreaService {
  private readonly jobs = inject(JobsService);
  private readonly geo = inject(GeoService);

  readonly selection = signal<AreaSelection | null>(null);
  readonly counts = signal<AreaCounts | null>(null);
  private countsAt = 0;
  private restored: Promise<void> | null = null;

  /** Reads the remembered area once */
  restore(): Promise<void> {
    this.restored ??= Preferences.get({ key: AREA_KEY }).then(({ value }) => {
      if (!value) return;
      try {
        const parsed = JSON.parse(value) as AreaSelection;
        if (parsed && Array.isArray(parsed.districtIds)) this.selection.set(parsed);
      } catch {
        // ignore a broken value; the user picks again
      }
    });
    return this.restored;
  }

  async set(selection: AreaSelection | null): Promise<void> {
    this.selection.set(selection);
    if (selection) await Preferences.set({ key: AREA_KEY, value: JSON.stringify(selection) });
    else await Preferences.remove({ key: AREA_KEY });
    await this.markPrompted();
  }

  /** First visit: no remembered area and the picker was never shown */
  async shouldPrompt(): Promise<boolean> {
    await this.restore();
    if (this.selection()) return false;
    const { value } = await Preferences.get({ key: PROMPTED_KEY });
    return !value;
  }

  async markPrompted(): Promise<void> {
    await Preferences.set({ key: PROMPTED_KEY, value: '1' });
  }

  /** Open-job counts per province / district (cached for a minute) */
  async loadCounts(force = false): Promise<AreaCounts | null> {
    if (!force && this.counts() && Date.now() - this.countsAt < COUNTS_TTL_MS) return this.counts();
    try {
      this.counts.set(await this.jobs.areaCounts());
      this.countsAt = Date.now();
    } catch {
      // counts are a nice-to-have; the picker works without them
    }
    return this.counts();
  }

  /** "ทุกพื้นที่", "เชียงใหม่ (ทั้งจังหวัด)", "เขตบางรัก, กรุงเทพฯ", "เชียงใหม่ · 3 อำเภอ" */
  label(selection: AreaSelection | null = this.selection()): string {
    if (!selection || !selection.provinceId) return 'ทุกพื้นที่';
    const province = selection.provinceId === BANGKOK_ID ? 'กรุงเทพฯ' : this.geo.provinceName(selection.provinceId);
    const ids = selection.districtIds;
    if (!ids.length) return `${province} (ทั้งจังหวัด)`;
    const unit = this.geo.districtLabel(selection.provinceId);
    if (ids.length === 1) return `${unit}${this.geo.districtName(ids[0])}, ${province}`;
    return `${province} · ${ids.length} ${unit}`;
  }
}
