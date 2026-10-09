import { AfterViewInit, Component, ElementRef, OnDestroy, computed, input, signal, viewChild } from '@angular/core';

import { thaiDate } from '../../shared/utils/format';

export interface LineSeries {
  key: string;
  label: string;
  /** CSS variable name of the series color, e.g. --viz-series-1 */
  color: string;
}

export interface LinePoint {
  date: string;
  values: Record<string, number>;
}

const PAD = { top: 12, right: 16, bottom: 28, left: 40 };

/** Clean, rounded axis ticks (0, 5, 10, ...) */
export function niceTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0, 1];
  const raw = max / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag;
  const top = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= top + step / 2; v += step) ticks.push(Math.round(v * 100) / 100);
  return ticks;
}

/**
 * Multi-series line chart (one shared count axis). Crosshair + tooltip on hover / arrow keys,
 * legend with line keys, and a table view so no value depends on hovering.
 */
@Component({
  selector: 'app-line-chart',
  template: `
    <div class="legend" role="list">
      @for (s of series(); track s.key) {
        <span class="legend-item" role="listitem">
          <span class="key" [style.background]="'var(' + s.color + ')'"></span>{{ s.label }}
        </span>
      }
    </div>

    <div class="plot" #plot (pointerleave)="active.set(null)">
      @if (width() > 0) {
        <svg
          [attr.width]="width()"
          [attr.height]="height()"
          role="img"
          [attr.aria-label]="ariaLabel()"
          tabindex="0"
          (keydown)="onKey($event)"
          (blur)="active.set(null)"
        >
          <!-- gridlines + y ticks -->
          @for (t of yTicks(); track t) {
            <line class="grid" [attr.x1]="padL" [attr.x2]="width() - padR" [attr.y1]="y(t)" [attr.y2]="y(t)"></line>
            <text class="tick" [attr.x]="padL - 8" [attr.y]="y(t)" text-anchor="end" dominant-baseline="middle">{{ t.toLocaleString('th-TH') }}</text>
          }
          <!-- x ticks -->
          @for (i of xTickIndexes(); track i) {
            <text class="tick" [attr.x]="x(i)" [attr.y]="height() - 8" [attr.text-anchor]="i === 0 ? 'start' : i === points().length - 1 ? 'end' : 'middle'">
              {{ shortDate(points()[i].date) }}
            </text>
          }
          <!-- lines -->
          @for (s of series(); track s.key) {
            <path class="line" [attr.d]="path(s.key)" [style.stroke]="'var(' + s.color + ')'"></path>
          }
          <!-- crosshair -->
          @if (active() !== null) {
            <line class="crosshair" [attr.x1]="x(active()!)" [attr.x2]="x(active()!)" [attr.y1]="padT" [attr.y2]="height() - padB"></line>
            @for (s of series(); track s.key) {
              <circle class="dot" [attr.cx]="x(active()!)" [attr.cy]="y(points()[active()!].values[s.key])" r="4" [style.fill]="'var(' + s.color + ')'"></circle>
            }
          }
          <!-- hit area: the whole plot, snapping to the nearest day -->
          <rect class="hit" [attr.x]="padL" [attr.y]="padT" [attr.width]="plotW()" [attr.height]="plotH()" (pointermove)="onMove($event)"></rect>
        </svg>

        @if (active() !== null) {
          <div class="tooltip" [style.left.px]="tooltipLeft()" [style.top.px]="padT">
            <div class="tt-date">{{ fullDate(points()[active()!].date) }}</div>
            @for (s of series(); track s.key) {
              <div class="tt-row">
                <span class="tt-key" [style.background]="'var(' + s.color + ')'"></span>
                <strong>{{ points()[active()!].values[s.key].toLocaleString('th-TH') }}</strong>
                <span class="tt-label">{{ s.label }}</span>
              </div>
            }
          </div>
        }
      }
    </div>

    <button type="button" class="table-toggle" (click)="showTable.set(!showTable())" [attr.aria-expanded]="showTable()">
      {{ showTable() ? 'ซ่อนตาราง' : 'ดูเป็นตาราง' }}
    </button>
    @if (showTable()) {
      <table class="data-table">
        <thead>
          <tr>
            <th>วันที่</th>
            @for (s of series(); track s.key) { <th>{{ s.label }}</th> }
          </tr>
        </thead>
        <tbody>
          @for (p of points(); track p.date) {
            <tr>
              <td>{{ fullDate(p.date) }}</td>
              @for (s of series(); track s.key) { <td>{{ p.values[s.key].toLocaleString('th-TH') }}</td> }
            </tr>
          }
        </tbody>
      </table>
    }
  `,
  styleUrls: ['charts.scss'],
  styles: `
    .legend {
      display: flex;
      flex-wrap: wrap;
      gap: 4px 16px;
      margin-bottom: 8px;
      font-size: 0.85rem;
      color: var(--viz-text-secondary);
    }
    .legend-item {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .key {
      width: 14px;
      height: 2px;
      border-radius: 1px;
    }
    .plot {
      position: relative;
      width: 100%;
    }
    svg {
      display: block;
      overflow: visible;
      outline: none;
    }
    svg:focus-visible {
      outline: 2px solid var(--ion-color-primary);
      outline-offset: 2px;
    }
    .grid {
      stroke: var(--viz-grid);
      stroke-width: 1;
    }
    .tick {
      fill: var(--viz-text-secondary);
      font-size: 11px;
      font-variant-numeric: tabular-nums;
    }
    .line {
      fill: none;
      stroke-width: 2;
      stroke-linejoin: round;
      stroke-linecap: round;
    }
    .crosshair {
      stroke: var(--viz-text-secondary);
      stroke-width: 1;
      opacity: 0.5;
    }
    .dot {
      stroke: var(--viz-surface);
      stroke-width: 2;
    }
    .hit {
      fill: transparent;
      cursor: crosshair;
    }
    .tooltip {
      position: absolute;
      pointer-events: none;
      min-width: 140px;
      padding: 8px 10px;
      border-radius: 8px;
      background: var(--viz-surface);
      border: 1px solid var(--viz-grid);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
      font-size: 0.8rem;
      color: var(--viz-text-primary);
    }
    .tt-date {
      color: var(--viz-text-secondary);
      margin-bottom: 4px;
    }
    .tt-row {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .tt-row strong {
      min-width: 24px;
      text-align: right;
      font-variant-numeric: tabular-nums;
    }
    .tt-key {
      width: 12px;
      height: 2px;
    }
    .tt-label {
      color: var(--viz-text-secondary);
    }
  `,
})
export class LineChartComponent implements AfterViewInit, OnDestroy {
  readonly series = input.required<LineSeries[]>();
  readonly points = input.required<LinePoint[]>();
  readonly height = input(240);
  readonly ariaLabel = input('กราฟเส้น');

  private readonly plot = viewChild<ElementRef<HTMLElement>>('plot');
  readonly width = signal(0);
  readonly active = signal<number | null>(null);
  readonly showTable = signal(false);
  private observer: ResizeObserver | null = null;

  readonly padL = PAD.left;
  readonly padR = PAD.right;
  readonly padT = PAD.top;
  readonly padB = PAD.bottom;

  readonly plotW = computed(() => Math.max(0, this.width() - PAD.left - PAD.right));
  readonly plotH = computed(() => Math.max(0, this.height() - PAD.top - PAD.bottom));
  readonly yTicks = computed(() => {
    const max = Math.max(0, ...this.points().flatMap((p) => this.series().map((s) => p.values[s.key] ?? 0)));
    return niceTicks(max);
  });
  /** First, last and a few evenly spaced dates in between */
  readonly xTickIndexes = computed(() => {
    const n = this.points().length;
    if (n <= 1) return n ? [0] : [];
    const slots = Math.min(n - 1, Math.max(1, Math.floor(this.plotW() / 90)));
    const set = new Set<number>();
    for (let k = 0; k <= slots; k++) set.add(Math.round((k * (n - 1)) / slots));
    return [...set];
  });
  readonly tooltipLeft = computed(() => {
    const i = this.active();
    if (i === null) return 0;
    const px = this.x(i);
    return px > this.width() / 2 ? px - 160 : px + 12;
  });

  ngAfterViewInit(): void {
    const el = this.plot()?.nativeElement;
    if (!el) return;
    this.observer = new ResizeObserver(([entry]) => this.width.set(Math.floor(entry.contentRect.width)));
    this.observer.observe(el);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  x(i: number): number {
    const n = this.points().length;
    return PAD.left + (n <= 1 ? 0 : (i / (n - 1)) * this.plotW());
  }

  y(v: number): number {
    const top = this.yTicks()[this.yTicks().length - 1] || 1;
    return PAD.top + this.plotH() - (v / top) * this.plotH();
  }

  path(key: string): string {
    return this.points()
      .map((p, i) => `${i ? 'L' : 'M'}${this.x(i).toFixed(1)},${this.y(p.values[key] ?? 0).toFixed(1)}`)
      .join(' ');
  }

  onMove(event: PointerEvent): void {
    const svg = (event.currentTarget as SVGElement).ownerSVGElement!;
    const px = event.clientX - svg.getBoundingClientRect().left;
    const n = this.points().length;
    if (!n) return;
    const i = Math.round(((px - PAD.left) / Math.max(1, this.plotW())) * (n - 1));
    this.active.set(Math.min(n - 1, Math.max(0, i)));
  }

  onKey(event: KeyboardEvent): void {
    const n = this.points().length;
    if (!n) return;
    const current = this.active() ?? n - 1;
    if (event.key === 'ArrowLeft') this.active.set(Math.max(0, current - 1));
    else if (event.key === 'ArrowRight') this.active.set(Math.min(n - 1, current + 1));
    else if (event.key === 'Escape') this.active.set(null);
    else return;
    event.preventDefault();
  }

  shortDate(date: string): string {
    const [, m, d] = date.split('-').map(Number);
    return `${d}/${m}`;
  }

  fullDate(date: string): string {
    return thaiDate(date);
  }
}
