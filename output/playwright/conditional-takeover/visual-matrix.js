async (page) => {
  const base = new URL(page.url());
  const steps = await page.evaluate(async () => (await import('/src/bootcamps/conditionals/openingCoursePath.ts')).OPENING_COURSE_PATH);
  const widths = [375, 640, 900, 1440];
  const routes = [{ id: 'lessons' }, ...steps.flatMap(step => step.type === 'drill' ? [{ id: step.id }, { id: step.id, run: true }] : [{ id: step.id }]), { id: 'tools' }, { id: 'tools', deck: 'foundation' }, { id: 'tools', deck: 'indicators' }];
  const representative = ['necessary', 'must-arrow', 'source-rephrase-contrapositive', 'mixed-practice', 'sufficient'];
  const failures = [], screenshots = [], checks = [];
  const navigateMenu = async name => {
    const railLink = page.locator('.oc-course-rail').getByRole('link', { name, exact: true });
    if (await railLink.isVisible()) await railLink.click();
    else {
      await page.getByRole('button', { name: 'Course menu', exact: true }).click();
      await page.getByRole('dialog').getByRole('link', { name, exact: true }).click();
    }
  };
  const navigate = async (route, theme) => {
    if (route.id === 'tools') {
      await navigateMenu('Flashcards');
      if (route.deck) await page.locator(`.co-flashcard-sets a[href*="deck=${route.deck}"]`).click();
    } else {
      await navigateMenu('Lessons');
      if (route.id !== 'lessons') {
        await page.locator(`.oc-course-path a[href="${base.pathname}?page=${route.id}"]`).click();
        if (route.run) await page.getByRole('link', { name: /^(Start|Continue) practice$/ }).click();
      }
    }
    await page.locator('.oc-course-screen').waitFor({ state: 'visible' });
    await page.evaluate(theme => document.documentElement.classList.toggle('light', theme === 'light'), theme);
    // Wait for layout and font metrics, without changing learner progress.
    await page.waitForTimeout(100);
  };
  const inspect = async () => page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    const visible = element => { const r = element.getBoundingClientRect(); const s = getComputedStyle(element); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
    const h = [...document.querySelectorAll('h1')].filter(visible).map(element => element.textContent.trim()).filter(Boolean);
    const controls = [...document.querySelectorAll('.oc-course-screen button, .oc-course-screen input, .oc-course-screen textarea, .oc-course-screen a')].filter(visible);
    const clipped = controls.filter(element => {
      const r = element.getBoundingClientRect();
      if (r.left >= -2 && r.right <= width + 2) return false;
      // A horizontally scrollable palette is reachable; document-level overflow is not.
      for (let parent = element.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
        if (['auto', 'scroll'].includes(getComputedStyle(parent).overflowX) && parent.scrollWidth > parent.clientWidth + 2) return false;
      }
      return true;
    }).map(element => ({ text: (element.getAttribute('aria-label') || element.textContent || '').trim().slice(0, 100), tag: element.tagName, left: Math.round(element.getBoundingClientRect().left), right: Math.round(element.getBoundingClientRect().right) }));
    return { heading: h, viewport: width, documentWidth: document.documentElement.scrollWidth, overflow: document.documentElement.scrollWidth > width + 2, clipped, controlCount: controls.length, themeClass: document.documentElement.classList.contains('light') ? 'light' : 'dark' };
  });
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of routes) {
      await navigate(route, 'light');
      const result = await inspect();
      const record = { width, page: route.id, run: !!route.run, deck: route.deck, theme: 'light', ...result };
      checks.push(record);
      if (!result.heading.length || result.overflow || result.clipped.length) failures.push(record);
      const screenshotTarget = representative.includes(route.id) && (route.id !== 'source-rephrase-contrapositive' && route.id !== 'mixed-practice' || route.run);
      if (screenshotTarget && (width === 375 || width === 1440)) {
        const path = `C:/Users/Joshu/dev/ai-os-projects/lsatu-conditional-takeover/output/playwright/conditional-takeover/visual-${route.id}-${width}-light.png`;
        await page.screenshot({ path, fullPage: true, timeout: 15000 }); screenshots.push(path);
      }
    }
  }
  for (const route of [{ id: 'necessary' }, { id: 'mixed-practice', run: true }]) {
    await page.setViewportSize({ width: 640, height: 900 }); await navigate(route, 'dark');
    const result = await inspect(); const record = { width: 640, page: route.id, run: !!route.run, theme: 'dark', ...result };
    checks.push(record); if (!result.heading.length || result.overflow || result.clipped.length) failures.push(record);
    const path = `C:/Users/Joshu/dev/ai-os-projects/lsatu-conditional-takeover/output/playwright/conditional-takeover/visual-${route.id}-640-dark.png`;
    await page.screenshot({ path, fullPage: true, timeout: 15000 }); screenshots.push(path);
  }
  await page.evaluate(() => document.documentElement.classList.add('light'));
  return { authoredCourseRoutes: steps.length, viewports: widths, checkedSurfaces: checks.length, failures, screenshots };
}



