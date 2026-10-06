import { HttpContext } from '@angular/common/http';
import { signal } from '@angular/core';
import { InfiniteScrollCustomEvent, RefresherCustomEvent } from '@ionic/angular';

import { Page } from '../models/page.model';
import { silentErrors, toApiError } from './api-error';

export type LoadState = 'loading' | 'ready' | 'empty' | 'error' | 'offline';

/** Maps a failed request to the page state: no connection vs. any other error */
export function errorState(err: unknown): LoadState {
  return toApiError(err).code === 'NETWORK_ERROR' ? 'offline' : 'error';
}

/**
 * State for a paginated list driven by ion-infinite-scroll and ion-refresher.
 * The first page is fetched silently (the page shows the error state instead of a toast);
 * later pages use the normal error toast.
 */
export class PagedList<T> {
  readonly items = signal<T[]>([]);
  readonly state = signal<LoadState>('loading');
  readonly hasNext = signal(false);

  private page = 0;
  // Ignores responses from a request that a newer reload replaced (e.g. a filter change)
  private version = 0;

  constructor(private readonly fetch: (page: number, context?: HttpContext) => Promise<Page<T>>) {}

  /** Starts again from page 1 and shows the loading state */
  async reload(): Promise<void> {
    const v = ++this.version;
    this.state.set('loading');
    this.items.set([]);
    this.hasNext.set(false);
    try {
      const res = await this.fetch(1, silentErrors());
      if (v !== this.version) return;
      this.apply(res, true);
    } catch (err) {
      if (v === this.version) this.state.set(errorState(err));
    }
  }

  /** Pull-to-refresh: keeps the current items on screen until page 1 arrives */
  async refresh(event?: RefresherCustomEvent): Promise<void> {
    const v = ++this.version;
    try {
      const res = await this.fetch(1, silentErrors());
      if (v === this.version) this.apply(res, true);
    } catch (err) {
      if (v === this.version && this.items().length === 0) this.state.set(errorState(err));
    } finally {
      await event?.target.complete();
    }
  }

  async loadMore(event?: InfiniteScrollCustomEvent): Promise<void> {
    const v = this.version;
    try {
      if (this.hasNext()) {
        const res = await this.fetch(this.page + 1);
        if (v === this.version) this.apply(res, false);
      }
    } catch {
      // the interceptor already showed a toast; scrolling again retries
    } finally {
      await event?.target.complete();
    }
  }

  /** Local edits after an action (e.g. remove a row that no longer matches the filter) */
  update(fn: (items: T[]) => T[]): void {
    this.items.update(fn);
    this.state.set(this.items().length ? 'ready' : 'empty');
  }

  private apply(res: Page<T>, replace: boolean): void {
    this.page = res.page;
    this.hasNext.set(res.hasNext);
    this.items.update((list) => (replace ? res.items : [...list, ...res.items]));
    this.state.set(this.items().length ? 'ready' : 'empty');
  }
}
