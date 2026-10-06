import { HttpContext } from '@angular/common/http';
import { signal } from '@angular/core';
import { RefresherCustomEvent } from '@ionic/angular';

import { silentErrors } from './api-error';
import { LoadState, errorState } from './paged-list';

/** Loading / error state for a page that shows one object (detail pages, dashboards). */
export class Loader<T> {
  readonly value = signal<T | null>(null);
  readonly state = signal<LoadState>('loading');
  private version = 0;

  constructor(private readonly fetch: (context: HttpContext) => Promise<T>) {}

  async load(): Promise<void> {
    const v = ++this.version;
    if (this.value() === null) this.state.set('loading');
    try {
      const value = await this.fetch(silentErrors());
      if (v !== this.version) return;
      this.value.set(value);
      this.state.set('ready');
    } catch (err) {
      if (v === this.version && this.value() === null) this.state.set(errorState(err));
    }
  }

  async refresh(event?: RefresherCustomEvent): Promise<void> {
    await this.load();
    await event?.target.complete();
  }

  set(value: T): void {
    this.value.set(value);
    this.state.set('ready');
  }
}
