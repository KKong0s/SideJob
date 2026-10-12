/**
 * Boot splash helpers. The splash itself is plain HTML + CSS in src/index.html so it paints
 * before Angular loads; these functions only fade it out (or show a failure message).
 */

/** Minimum time the splash stays up, so a fast load does not flash it */
export const SPLASH_MIN_MS = 800;
/** Fallback removal delay in case `transitionend` never fires (e.g. reduced motion) */
export const SPLASH_FADE_MS = 350;

const SPLASH_ID = 'sj-splash';
/** App chrome color for phone browsers once the splash is gone */
const APP_THEME_COLOR = '#FFFFFF';

declare global {
  interface Window {
    __sjSplashStart?: number;
  }
}

let hiding: Promise<void> | null = null;

/**
 * Fades the splash out after at least SPLASH_MIN_MS since page start, then removes it.
 * Safe to call more than once; later calls return the same promise.
 */
export function hideSplash(doc: Document = document, now: () => number = Date.now): Promise<void> {
  if (hiding) return hiding;
  const splash = doc.getElementById(SPLASH_ID);
  if (!splash) return Promise.resolve();

  const start = doc.defaultView?.__sjSplashStart ?? now();
  const wait = Math.max(0, SPLASH_MIN_MS - (now() - start));

  hiding = new Promise<void>((resolve) => {
    setTimeout(() => {
      const remove = () => {
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
  doc.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((meta) => {
    meta.content = APP_THEME_COLOR;
  });
}
