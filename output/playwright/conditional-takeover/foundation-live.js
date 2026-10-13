async (page) => {
  const runner = page.locator('.oc-course-body:not([hidden]) .d1-experience');
  await runner.waitFor();
  let firstCorrect = 0;
  for (let question = 0; question < 24; question++) {
    const next = runner.locator('.d1-navigation .d1-next');
    if (!await next.isDisabled()) throw new Error(`Question ${question + 1} began already resolved`);
    if (question === 0) {
      for (let miss = 0; miss < 2; miss++) {
        await runner.locator('.d1-options button').nth(0).click();
        await runner.getByRole('button', { name: 'Check answer', exact: true }).click();
        if (!await next.isDisabled()) throw new Error('Wrong answer advanced');
        if (miss === 0) await runner.getByRole('button', { name: 'Try again', exact: true }).click();
      }
      await runner.getByRole('button', { name: 'Show me', exact: true }).click();
      await page.reload(); await runner.waitFor();
      if (!await next.isEnabled()) throw new Error('Assisted review lost on reload');
    } else {
      const count = await runner.locator('.d1-options button').count();
      let resolved = false;
      for (let option = 0; option < count; option++) {
        await runner.locator('.d1-options button').nth(option).click();
        await runner.getByRole('button', { name: 'Check answer', exact: true }).click();
        if (await next.isEnabled()) { if (option === 0) firstCorrect++; resolved = true; break; }
        if (await runner.locator('.d1-relation').count()) throw new Error('Wrong answer exposed the diagram');
        await runner.getByRole('button', { name: 'Try again', exact: true }).click();
      }
      if (!resolved) throw new Error(`Question ${question + 1} has no completable answer`);
    }
    await next.click();
  }
  await runner.getByRole('heading', { name: 'Spot the condition complete.' }).waitFor();
  if (!(await runner.locator('.d1-result').innerText()).includes(`${firstCorrect} of 24`)) throw new Error('First-answer score incorrect');
  if (!(await runner.innerText()).includes('1 reviewed with Show me')) throw new Error('Assistance not reported');
  await page.reload(); await runner.waitFor();
  await runner.getByRole('button', { name: 'Start a new round', exact: true }).click();
  if (await runner.getByRole('progressbar').getAttribute('aria-valuenow') !== '0') throw new Error('New round did not reset current progress');
  const url = new URL(page.url()); url.searchParams.set('page', 'lessons'); url.searchParams.delete('run');
  await page.goto(url.href);
  const card = page.locator('.oc-course-path li:has(a[href*="page=foundation-practice"])');
  await card.waitFor(); if (!(await card.innerText()).includes('Done')) throw new Error('New round erased historic Done');
  return { questions: 24, firstCorrect, assisted: 1, reload: true, newRound: true, historicalDone: true };
}
