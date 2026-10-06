import { Component, computed, input, model } from '@angular/core';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { star, starHalf, starOutline } from 'ionicons/icons';

/**
 * Star rating. Read-only by default (value can be fractional, e.g. 4.3);
 * with [editable]="true" it is a 1–5 picker bound with [(value)].
 */
@Component({
  selector: 'app-stars',
  template: `
    <span class="stars" [class.editable]="editable()" [attr.role]="editable() ? 'radiogroup' : 'img'" [attr.aria-label]="label()">
      @for (s of slots; track s) {
        @if (editable()) {
          <button type="button" (click)="value.set(s)" [attr.aria-label]="s + ' ดาว'" [attr.aria-checked]="value() === s" role="radio">
            <ion-icon [name]="icon(s)"></ion-icon>
          </button>
        } @else {
          <ion-icon [name]="icon(s)" aria-hidden="true"></ion-icon>
        }
      }
      @if (count() !== null) {
        <span class="text">
          @if (value()) { {{ value()!.toFixed(1) }} } @else { ยังไม่มีรีวิว }
          @if (count()) { ({{ count() }}) }
        </span>
      }
    </span>
  `,
  styles: `
    .stars {
      display: inline-flex;
      align-items: center;
      gap: 1px;
      color: #f5a623;
      vertical-align: middle;
    }
    ion-icon {
      font-size: 1em;
    }
    .editable ion-icon {
      font-size: 2rem;
    }
    button {
      background: none;
      border: 0;
      padding: 2px;
      color: inherit;
      cursor: pointer;
    }
    .text {
      margin-left: 4px;
      font-size: 0.85em;
      color: var(--ion-color-medium);
    }
  `,
  imports: [IonIcon],
})
export class StarsComponent {
  readonly value = model<number | null>(null);
  readonly editable = input(false);
  /** Shows "4.3 (12)" after the stars when set */
  readonly count = input<number | null>(null);

  readonly slots = [1, 2, 3, 4, 5];
  readonly label = computed(() => (this.value() ? `${this.value()!.toFixed(1)} จาก 5 ดาว` : 'ยังไม่มีคะแนน'));

  constructor() {
    addIcons({ star, starHalf, starOutline });
  }

  icon(slot: number): string {
    const v = this.value() ?? 0;
    if (v >= slot) return 'star';
    if (!this.editable() && v >= slot - 0.5) return 'star-half';
    return 'star-outline';
  }
}
