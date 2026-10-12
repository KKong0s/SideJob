import { SPLASH_FADE_MS, SPLASH_MIN_MS, failSplash, hideSplash } from './splash';

describe('splash', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.head.innerHTML = '<meta name="theme-color" content="#1F3A13" />';
    document.body.innerHTML = `
      <div id="sj-splash" role="status">
        <div class="sj-text"><h1>กำลังวิ่งไปหางานให้คุณ…</h1><p>รอแป๊บเดียว เดี๋ยวก็ถึง</p></div>
      </div>`;
  });

  afterEach(() => {
    vi.useRealTimers();
    delete window.__sjSplashStart;
  });

  it('stays up for the minimum time, then fades out and is removed', async () => {
    window.__sjSplashStart = 1000;
    const done = hideSplash(document, () => 1300); // 300ms in: 500ms left

    vi.advanceTimersByTime(SPLASH_MIN_MS - 300 - 1);
    expect(document.getElementById('sj-splash')?.classList.contains('sj-hide')).toBe(false);

    vi.advanceTimersByTime(1);
    expect(document.getElementById('sj-splash')?.classList.contains('sj-hide')).toBe(true);

    vi.advanceTimersByTime(SPLASH_FADE_MS);
    await done;
    expect(document.getElementById('sj-splash')).toBeNull();
    expect(document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.content).toBe('#FFFFFF');
  });

  it('hides right away when the minimum time has already passed', async () => {
    window.__sjSplashStart = 0;
    const done = hideSplash(document, () => 5000);
    vi.advanceTimersByTime(0);
    document.getElementById('sj-splash')?.dispatchEvent(new Event('transitionend'));
    await done;
    expect(document.getElementById('sj-splash')).toBeNull();
  });

  it('can be called repeatedly without errors', async () => {
    window.__sjSplashStart = 0;
    const first = hideSplash(document, () => 5000);
    expect(hideSplash(document, () => 5000)).toBe(first);
    vi.advanceTimersByTime(SPLASH_FADE_MS);
    await first;
    await expect(hideSplash(document)).resolves.toBeUndefined();
  });

  it('shows a failure message and keeps the splash when bootstrap fails', () => {
    failSplash(document);
    const splash = document.getElementById('sj-splash');
    expect(splash?.classList.contains('sj-failed')).toBe(true);
    expect(splash?.getAttribute('role')).toBe('alert');
    expect(splash?.querySelector('h1')?.textContent).toBe('โหลดไม่สำเร็จ');
    expect(splash?.querySelector('p')?.textContent).toBe('ลองรีเฟรชหน้าอีกครั้ง');
  });
});
