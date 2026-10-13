import { setStatusBar } from './status-bar';

/**
 * Boot splash helpers. The splash itself is plain HTML + CSS in src/index.html so it paints
 * before Angular loads; these functions only fade it out (or show a failure message).
 */

/** Minimum time the splash stays up, long enough to see the runner (and so a fast load does not flash it) */
export const SPLASH_MIN_MS = 1500;
/** Fallback removal delay in case `transitionend` never fires (e.g. reduced motion) */
export const SPLASH_FADE_MS = 350;

const SPLASH_ID = 'sj-splash';
/** App chrome color for phone browsers once the splash is gone */
const APP_THEME_COLOR = '#FFFFFF';
const THEME_COLOR_SELECTOR = 'meta[name="theme-color"]';

declare global {
  interface Window {
    __sjSplashStart?: number;
  }
}

let hiding: Promise<void> | null = null;
/** Pristine copy of the splash (and the splash-time theme colors) kept so showSplash() can bring it back */
let template: HTMLElement | null = null;
let splashThemeColors: string[] | null = null;

/**
 * Shows the splash again (e.g. right after signing in) and restarts its minimum-time clock.
 * Pair with hideSplash() once the next page is ready.
 */
export function showSplash(doc: Document = document, now: () => number = Date.now): void {
  const win = doc.defaultView;
  if (win) win.__sjSplashStart = now();
  void setStatusBar('splash');
  const existing = doc.getElementById(SPLASH_ID);
  if (existing) {
    existing.classList.remove('sj-hide');
    return;
  }
  if (!template) return;
  doc.body.prepend(template.cloneNode(true));
  if (splashThemeColors) {
    const colors = splashThemeColors;
    doc.querySelectorAll<HTMLMetaElement>(THEME_COLOR_SELECTOR).forEach((meta, i) => (meta.content = colors[i] ?? meta.content));
  }
}

/**
 * Fades the splash out after at least SPLASH_MIN_MS since page start, then removes it.
 * Safe to call more than once; later calls return the same promise.
 */
export function hideSplash(doc: Document = document, now: () => number = Date.now): Promise<void> {
  if (hiding) return hiding;
  const splash = doc.getElementById(SPLASH_ID);
  if (!splash) return Promise.resolve();
  if (!template) {
    template = splash.cloneNode(true) as HTMLElement;
    template.classList.remove('sj-hide', 'sj-failed');
  }

  const start = doc.defaultView?.__sjSplashStart ?? now();
  const wait = Math.max(0, SPLASH_MIN_MS - (now() - start));

  hiding = new Promise<void>((resolve) => {
    setTimeout(() => {
      const remove = () => {
        if (!splash.classList.contains('sj-hide')) {
          // showSplash() brought it back before the fade finished
          hiding = null;
          resolve();
          return;
        }
        splash.remove();
        resetThemeColor(doc);
        hiding = null;
        resolve();
      };
      splash.addEventListener('transitionend', remove, { once: true });
      setTimeout(() => {
        if (splash.isConnected) remove();
      }, SPLASH_FADE_MS);
      splash.classList.add('sj-hide');
    }, wait);
  });
  return hiding;
}

/** Keeps the splash up with a failure message and stops its animation (bootstrap failed) */
export function failSplash(doc: Document = document): void {
  const splash = doc.getElementById(SPLASH_ID);
  if (!splash) return;
  splash.classList.add('sj-failed');
  splash.setAttribute('role', 'alert');
  const title = splash.querySelector('.sj-text h1');
  const line = splash.querySelector('.sj-text p');
  if (title) title.textContent = 'โหลดไม่สำเร็จ';
  if (line) line.textContent = 'ลองรีเฟรชหน้าอีกครั้ง';
}

/** Phone browsers tint their bars dark green during the splash; switch back to the app color */
function resetThemeColor(doc: Document): void {
  const metas = doc.querySelectorAll<HTMLMetaElement>(THEME_COLOR_SELECTOR);
  splashThemeColors ??= Array.from(metas, (meta) => meta.content);
  metas.forEach((meta) => {
    meta.content = APP_THEME_COLOR;
  });
  void setStatusBar('app');
}
