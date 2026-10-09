import { Component } from '@angular/core';

/** SideJob wordmark: lime dot with a dark-green ring + "SideJob" */
@Component({
  selector: 'app-brand-logo',
  template: `<span class="dot" aria-hidden="true"></span><span class="word">SideJob</span>`,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      line-height: 1;
    }
    .dot {
      width: 14px;
      height: 14px;
      box-sizing: border-box;
      border-radius: 50%;
      background: var(--sj-lime);
      border: 3px solid var(--sj-dark);
    }
    .word {
      font-family: var(--sj-font-heading);
      font-weight: 700;
      font-size: 24px;
      color: var(--sj-dark);
    }
  `,
})
export class BrandLogoComponent {}
