import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonBadge,
  IonButton,
  IonChip,
  IonContent,
  IonHeader,
  IonIcon,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonLabel,
  IonList,
  IonNote,
  IonRefresher,
  IonRefresherContent,
  IonSearchbar,
  IonTitle,
  IonToolbar,
  ModalController,
  RefresherCustomEvent,
  IonButtons,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { chevronDown, locationOutline, optionsOutline, searchOutline } from 'ionicons/icons';

import { BellButtonComponent } from '../../../shared/components/bell-button/bell-button.component';
import { openAreaPicker } from '../../../shared/components/area-picker/area-picker.component';
import { JobCardComponent } from '../../../shared/components/job-card/job-card.component';
import { PageStateComponent } from '../../../shared/components/page-state/page-state.component';
import { EMPTY_FILTER, JobFilter, PublicJob } from '../../../shared/models/search.model';
import { AreaService } from '../../../shared/services/area.service';
import { GeoService } from '../../../shared/services/geo.service';
import { JobsService } from '../../../shared/services/jobs.service';
import { timeAgo } from '../../../shared/utils/format';
import { registerCategoryIcons } from '../../../shared/utils/icons';
import { PagedList } from '../../../shared/utils/paged-list';
import { JobFilterComponent } from './job-filter.component';

/** Seeker home: job search by area, category, wage and work days */
@Component({
  selector: 'app-seeker-search',
  templateUrl: 'search.page.html',
  styleUrls: ['search.page.scss'],
  imports: [
    BellButtonComponent,
    IonButtons,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButton,
    IonIcon,
    IonBadge,
    IonSearchbar,
    IonContent,
    IonRefresher,
    IonRefresherContent,
    IonChip,
    IonLabel,
    IonList,
    IonNote,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    JobCardComponent,
    PageStateComponent,
  ],
})
export class SearchPage {
  private readonly jobsApi = inject(JobsService);
  private readonly geo = inject(GeoService);
  private readonly modals = inject(ModalController);
  private readonly router = inject(Router);
  readonly area = inject(AreaService);
  readonly categories = this.jobsApi.categories;

  readonly filter = signal<JobFilter>(EMPTY_FILTER);
  readonly query = signal('');
  readonly list = new PagedList<PublicJob>((page, ctx) =>
    this.jobsApi.search(this.area.selection(), this.filter(), this.query(), page, ctx),
  );

  readonly areaLabel = computed(() => this.area.label(this.area.selection()));
  /** Number of active filters in the filter sheet (category has its own chips) */
  readonly filterCount = computed(() => {
    const f = this.filter();
    return (f.wageUnit ? 1 : 0) + (f.wageMin !== null || f.wageMax !== null ? 1 : 0) + (f.workDays.length ? 1 : 0);
  });
  readonly emptyAction = computed(() => {
    const a = this.area.selection();
    if (a?.districtIds.length) return 'ขยายเป็นทั้งจังหวัด';
    if (a?.provinceId) return 'ขยายเป็นทุกพื้นที่';
    if (this.filterCount() || this.filter().categoryId || this.query()) return 'ล้างตัวกรอง';
    return '';
  });

  readonly timeAgo = timeAgo;
  private started = false;

  constructor() {
    addIcons({ chevronDown, locationOutline, optionsOutline, searchOutline });
    registerCategoryIcons();
  }

  async ionViewWillEnter(): Promise<void> {
    if (this.started) return;
    this.started = true;
    // Geo names are needed for the area label; categories for the chips
    await Promise.all([this.geo.load().catch(() => undefined), this.area.restore(), this.jobsApi.loadCategories().catch(() => [])]);
    void this.list.reload();
    if (await this.area.shouldPrompt()) {
      await this.area.markPrompted();
      await this.chooseArea(true);
    }
  }

  async chooseArea(firstRun = false): Promise<void> {
    await this.geo.load();
    const counts = await this.area.loadCounts();
    const result = await openAreaPicker(this.modals, {
      selection: this.area.selection(),
      counts,
      cancelText: firstRun ? 'ข้าม' : 'ยกเลิก',
    });
    if (!result) return;
    await this.area.set(result.provinceId ? result : null);
    void this.list.reload();
  }

  async openFilter(): Promise<void> {
    const modal = await this.modals.create({ component: JobFilterComponent, componentProps: { filter: this.filter() } });
    await modal.present();
    const { data, role } = await modal.onWillDismiss<JobFilter>();
    if (role !== 'confirm' || !data) return;
    this.filter.set(data);
    void this.list.reload();
  }

  setCategory(categoryId: number | null): void {
    this.filter.update((f) => ({ ...f, categoryId }));
    void this.list.reload();
  }

  setQuery(value: string): void {
    this.query.set(value.trim());
    void this.list.reload();
  }

  /** Empty-state button: widen the area step by step, then clear filters */
  async widen(): Promise<void> {
    const a = this.area.selection();
    if (a?.districtIds.length) {
      await this.area.set({ provinceId: a.provinceId, districtIds: [] });
    } else if (a?.provinceId) {
      await this.area.set(null);
    } else {
      this.filter.set(EMPTY_FILTER);
      this.query.set('');
    }
    void this.list.reload();
  }

  async refresh(event: RefresherCustomEvent): Promise<void> {
    void this.area.loadCounts(true);
    await this.list.refresh(event);
  }

  open(job: PublicJob): void {
    void this.router.navigate(['/seeker/jobs', job.id]);
  }
}
