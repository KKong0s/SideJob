import { AfterViewInit, Component, Input, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import {
  IonButton,
  IonButtons,
  IonCheckbox,
  IonContent,
  IonFooter,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonSearchbar,
  IonTitle,
  IonToolbar,
  ModalController,
} from '@ionic/angular';

import { GeoService } from '../../services/geo.service';
import { Searchable, searchPlaces } from './geo-search';

/** Value used for "ทั้งจังหวัด" in district multi-select */
export const WHOLE_PROVINCE = 0;

/**
 * Searchable province / district picker shown as a modal.
 * Open it with `openGeoPicker()`; it resolves with the chosen id(s) or null when cancelled.
 */
@Component({
  selector: 'app-geo-picker',
  templateUrl: 'geo-picker.component.html',
  styleUrls: ['geo-picker.component.scss'],
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonSearchbar,
    IonList,
    IonItem,
    IonLabel,
    IonCheckbox,
    IonFooter,
  ],
})
export class GeoPickerComponent implements OnInit, AfterViewInit {
  private readonly modal = inject(ModalController);
  private readonly geo = inject(GeoService);

  // Set through ModalController componentProps
  @Input() mode: 'province' | 'district' = 'province';
  @Input() provinceId: number | null = null;
  @Input() multiple = false;
  @Input() selected: number[] = [];

  readonly searchbar = viewChild(IonSearchbar);
  readonly query = signal('');
  readonly picked = signal<Set<number>>(new Set());

  title = '';
  placeholder = '';
  private options: Searchable[] = [];

  readonly results = computed(() => searchPlaces(this.options, this.query()));
  readonly pickedCount = computed(() => this.picked().size);
  readonly wholeProvince = computed(() => this.picked().has(WHOLE_PROVINCE));

  ngOnInit(): void {
    if (this.mode === 'province') {
      this.options = this.geo.provinces();
      this.title = 'เลือกจังหวัด';
      this.placeholder = 'พิมพ์ชื่อจังหวัด เช่น เชียงใหม่, กทม';
    } else {
      const label = this.geo.districtLabel(this.provinceId);
      this.options = this.geo.districtsOf(this.provinceId);
      this.title = `เลือก${label} · ${this.geo.provinceName(this.provinceId ?? 0)}`;
      this.placeholder = `พิมพ์ชื่อ${label}`;
    }
    this.picked.set(new Set(this.selected));
  }

  ngAfterViewInit(): void {
    // Wait for the modal animation so the keyboard opens on mobile
    setTimeout(() => void this.searchbar()?.setFocus(), 350);
  }

  isPicked(id: number): boolean {
    return this.picked().has(id);
  }

  /** Single choice: pick and close. */
  choose(id: number): void {
    void this.modal.dismiss([id], 'confirm');
  }

  /** Multiple choice: "ทั้งจังหวัด" and specific districts exclude each other. */
  toggle(id: number): void {
    this.picked.update((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else if (id === WHOLE_PROVINCE) {
        next.clear();
        next.add(WHOLE_PROVINCE);
      } else {
        next.delete(WHOLE_PROVINCE);
        next.add(id);
      }
      return next;
    });
  }

  confirm(): void {
    void this.modal.dismiss([...this.picked()], 'confirm');
  }

  cancel(): void {
    void this.modal.dismiss(null, 'cancel');
  }

  /** Enter in the search box picks the top result (single choice only). */
  pickFirst(): void {
    const first = this.results()[0];
    if (!this.multiple && first) this.choose(first.id);
  }
}

export interface GeoPickerOptions {
  mode: 'province' | 'district';
  provinceId?: number | null;
  multiple?: boolean;
  selected?: number[];
}

/** Opens the picker; resolves with the chosen ids, or null if the user cancelled. */
export async function openGeoPicker(modals: ModalController, options: GeoPickerOptions): Promise<number[] | null> {
  const modal = await modals.create({
    component: GeoPickerComponent,
    componentProps: {
      mode: options.mode,
      provinceId: options.provinceId ?? null,
      multiple: options.multiple ?? false,
      selected: options.selected ?? [],
    },
  });
  await modal.present();
  const { data, role } = await modal.onWillDismiss<number[]>();
  return role === 'confirm' && data ? data : null;
}
