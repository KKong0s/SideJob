import { Component, computed, input } from '@angular/core';

import { Job, daysText, locationText, timeText, wageShortText, wageText } from '../../models/job.model';
import { timeAgo } from '../../utils/format';

/**
 * One job as a clean row: title / "shop · posted" / "district, province · days time" on the left,
 * the wage pill on the right. Extra lines go in the "meta" slot, badges / buttons in the "end" slot.
 * The host is the click target (role="button"), so pages keep binding (click) on <app-job-card>.
 */
@Component({
  selector: 'app-job-card',
  host: {
    class: 'job-row',
    role: 'button',
    tabindex: '0',
    '(keydown.enter)': 'activate($event)',
    '(keydown.space)': 'activate($event)',
  },
  template: `
    <div class="main">
      <h3 class="title">{{ job().title }}</h3>
      @if (shopName() || postedAt()) {
        <p class="shop">
          {{ shopName() }}
          @if (shopName() && postedAt()) { · }
          @if (postedAt()) { {{ ago() }} }
        </p>
      }
      <p class="where">{{ location() }} · {{ days() }} {{ time() }}</p>
      <ng-content select="[meta]"></ng-content>
    </div>
    <div class="end">
      <span class="sj-wage" [attr.aria-label]="'ค่าจ้าง ' + wageFull()">{{ wage() }}</span>
      <ng-content select="[end]"></ng-content>
    </div>
  `,
  styles: `
    :host {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      padding: 18px 16px;
      border-radius: var(--sj-radius-card);
      border-bottom: 1.5px solid var(--sj-divider);
      cursor: pointer;
      transition: background-color var(--sj-dur-state) var(--sj-ease-out);
      min-width: 0;
      /* New rows rise in once; lists pass --sj-i (capped) for a short stagger */
      animation: sj-rise var(--sj-dur-enter) var(--sj-ease-out) backwards;
      animation-delay: calc(min(var(--sj-i, 0), 10) * 30ms);
    }
    :host(:hover),
    :host(:focus-visible) {
      background: var(--sj-selected);
    }
    .main {
      flex: 1;
      min-width: 0;
    }
    .title {
      margin: 0 0 4px;
      font-family: var(--sj-font-heading);
      font-weight: 600;
      font-size: 17px;
      line-height: 1.4;
      color: var(--sj-text);
    }
    p {
      margin: 2px 0 0;
      font-size: 14px;
      line-height: 1.5;
    }
    .shop {
      color: var(--sj-text-muted);
    }
    .where {
      color: var(--sj-text-secondary);
    }
    .end {
      flex: none;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 6px;
    }
  `,
})
export class JobCardComponent {
  readonly job = input.required<Job>();
  readonly shopName = input<string | null>(null);
  /** Kept for existing callers; the row layout no longer shows the shop image */
  readonly shopImage = input<string | null>(null);
  /** ISO time the job was posted; shown as "x ago" after the shop name */
  readonly postedAt = input<string | null>(null);

  readonly wage = computed(() => wageShortText(this.job()));
  readonly wageFull = computed(() => wageText(this.job()));
  readonly location = computed(() => locationText(this.job()));
  readonly days = computed(() => daysText(this.job()));
  readonly time = computed(() => timeText(this.job()));
  readonly ago = computed(() => timeAgo(this.postedAt() ?? ''));

  /** Keyboard users open the job with Enter / Space like a button */
  activate(event: Event): void {
    if (event.target !== event.currentTarget) return;
    event.preventDefault();
    (event.currentTarget as HTMLElement).click();
  }
}
