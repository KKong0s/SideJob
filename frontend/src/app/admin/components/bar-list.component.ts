import { Component, computed, input, signal } from '@angular/core';

export interface BarItem {
  name: string;
  value: number;
}

/**
 * Horizontal bars for "how many per category" (one series, so one color).
 * Every value is printed at the bar's tip; the table view repeats the numbers.
 */
@Component({
  selector: 'app-bar-list',
  template: `
    <ul class="bars" [attr.aria-label]="ariaLabel()">
      @for (item of items(); track item.name) {
        <li class="row" [class.dim]="hovered() !== null && hovered() !== item.name"
            (pointerenter)="hovered.set(item.name)" (pointerleave)="hovered.set(null)">
          <span class="name" [title]="item.name">{{ item.name }}</span>
          <span class="track">
            <span class="bar" [style.width.%]="percent(item.value)"></span>
            <span class="value">{{ item.value.toLocaleString('th-TH') }}{{ unit() }}</span>
          </span>
        </li>
      } @empty {
        <li class="empty">ยังไม่มีข้อมูล</li>
      }
    </ul>

    <button type="button" class="table-toggle" (click)="showTable.set(!showTable())" [attr.aria-expanded]="showTable()">
      {{ showTable() ? 'ซ่อนตาราง' : 'ดูเป็นตาราง' }}
    </button>
    @if (showTable()) {
      <table class="data-table">
        <thead><tr><th>{{ nameHeader() }}</th><th>{{ valueHeader() }}</th></tr></thead>
        <tbody>
          @for (item of items(); track item.name) {
            <tr><td>{{ item.name }}</td><td>{{ item.value.toLocaleString('th-TH') }}</td></tr>
          }
        </tbody>
      </table>
    }
  `,
  styleUrls: ['charts.scss'],
  styles: `
    .bars {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .row {
      display: grid;
      grid-template-columns: minmax(88px, 38%) 1fr;
      align-items: center;
      gap: 8px;
      font-size: 0.85rem;
      transition: opacity 0.15s;
    }
    .row.dim {
      opacity: 0.45;
    }
    .name {
      color: var(--viz-text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .track {
      display: flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
    }
    .bar {
      display: block;
      height: 14px;
      min-width: 2px;
      /* square at the baseline, rounded at the data end */
      border-radius: 0 4px 4px 0;
      background: var(--viz-bar);
    }
    .value {
      color: var(--viz-text-secondary);
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }
    .empty {
      color: var(--viz-text-secondary);
      font-size: 0.85rem;
    }
  `,
})
export class BarListComponent {
  readonly items = input.required<BarItem[]>();
  readonly unit = input('');
  readonly ariaLabel = input('');
  readonly nameHeader = input('รายการ');
  readonly valueHeader = input('จำนวน');

  readonly hovered = signal<string | null>(null);
  readonly showTable = signal(false);
  private readonly max = computed(() => Math.max(1, ...this.items().map((i) => i.value)));

  /** Leaves room after the longest bar for its value label */
  percent(value: number): number {
    return (value / this.max()) * 78;
  }
}
