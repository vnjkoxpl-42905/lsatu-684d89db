async (page) => {
  const base = new URL(page.url());
  const results = [];
  for (const lesson of ['sufficient', 'necessary']) {
    const url = new URL(base); url.searchParams.set('page', lesson); url.searchParams.delete('run');
    await page.goto(url.href); await page.locator('.oc-course-body:not([hidden])').waitFor({ state: 'visible' });
    const videos = page.locator('.oc-course-body:not([hidden]) video');
    if (!(await videos.count())) results.push({ lesson, error: 'No teaching video exists on this lesson' });
    for (let index = 0; index < await videos.count(); index++) {
      const video = videos.nth(index); await video.scrollIntoViewIfNeeded();
      // A real pointer interaction precedes playback. No authored source or learner record is changed.
      await video.click({ position: { x: 15, y: 15 } });
      const result = await video.evaluate(async element => {
        const source = element.currentSrc || element.querySelector('source')?.src || element.src;
        const startingTime = element.currentTime;
        const oldMuted = element.muted; element.muted = true;
        try {
          await element.play();
          await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => { cleanup(); reject(new Error('Playback did not advance within 8 seconds')); }, 8000);
            const check = () => { if (element.readyState >= 2 && element.currentTime > startingTime + 0.05) { cleanup(); resolve(); } };
            const fail = () => { cleanup(); reject(new Error(element.error?.message || 'Video error')); };
            const cleanup = () => { clearTimeout(timeout); element.removeEventListener('timeupdate', check); element.removeEventListener('error', fail); };
            element.addEventListener('timeupdate', check); element.addEventListener('error', fail); check();
          });
          return { source, duration: element.duration, readyState: element.readyState, advanced: element.currentTime - startingTime, played: true };
        } catch (error) { return { source, played: false, error: String(error), readyState: element.readyState }; }
        finally { element.pause(); element.muted = oldMuted; }
      });
      results.push({ lesson, index, ...result });
    }
  }
  return results;
}
