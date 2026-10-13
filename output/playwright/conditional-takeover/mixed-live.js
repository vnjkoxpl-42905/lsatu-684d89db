async (page) => {
  const base = new URL(page.url());
  const authored = await page.evaluate(async () => {
    const drill = await import('/src/bootcamps/conditionals/components/OpeningMixedDrill.tsx');
    const content = await import('/src/bootcamps/conditionals/content/mixedDrillItems.ts');
    const independent = await import('/src/bootcamps/conditionals/components/MixedFamilyPractice.tsx');
    return { complete: content.completeConditionItems, diagrams: drill.openingDiagramItems, independent: independent.mixedFamilyItems, equivalence: content.equivalenceItems, transfer: content.transferItems, fresh: content.confirmationItemsByError.qualification[0] };
  });
  const require = (condition, message) => { if (!condition) throw new Error(message); };
  const url = new URL(base); url.searchParams.set('page', 'mixed-practice'); url.searchParams.set('run', '1');
  await page.goto(url.href);
  const runner = page.locator('.oc-course-body:not([hidden]) .omd-runner');
  await runner.waitFor({ state: 'visible' });
  const intro = async () => {
    const introduction = runner.locator('.omd-introduction:not([hidden])');
    if (await introduction.count()) await introduction.getByRole('button', { name: /Begin practice|Continue/, exact: true }).click();
  };
  await intro();
  const active = () => runner.locator('[data-mixed-question]:not([hidden])');
  const next = () => runner.locator('.omd-navigation').getByRole('button', { name: /Next question|Try a fresh case|Review practice|Finish practice/, exact: true });
  require((await runner.locator('.omd-progress-heading').innerText()).includes('Question 1 of 24'), 'Mixed requires a fresh first question');
  const questions = [...authored.complete.map(item => ({ kind: 'choice', item })), ...authored.diagrams.map(item => ({ kind: 'diagram', item })), ...authored.independent.map(item => ({ kind: 'independent', item })), ...authored.equivalence.map(item => ({ kind: 'choice', item })), ...authored.transfer.map(item => ({ kind: 'choice', item }))];
  for (let index = 0; index < questions.length; index++) {
    const { kind, item } = questions[index];
    if (kind === 'choice') {
      if (index === 0) {
        await active().getByRole('button', { name: item.options[0], exact: true }).click();
        await active().getByRole('button', { name: 'Check answer', exact: true }).click();
        require(await next().isDisabled(), 'Mixed wrong choice advanced');
        await active().getByRole('button', { name: 'Try this question again', exact: true }).click();
      }
      await active().getByRole('button', { name: item.options[item.correct], exact: true }).click();
      await active().getByRole('button', { name: 'Check answer', exact: true }).click();
    } else if (kind === 'diagram') {
      await active().getByRole('button', { name: 'Choose the left condition', exact: true }).click();
      await active().getByRole('button', { name: item.left, exact: true }).click();
      await active().getByRole('button', { name: 'Choose the right condition', exact: true }).click();
      await active().getByRole('button', { name: item.right, exact: true }).click();
      await active().getByRole('button', { name: 'Check answer', exact: true }).click();
    } else {
      require(await active().getByRole('button', { name: 'Compare with the choices', exact: true }).isDisabled(), 'Independent blank writing exposed choices');
      const draft = `${item.left} → ${item.right}`;
      await active().getByLabel('Your diagram', { exact: true }).fill(draft);
      await active().getByLabel('Read it in English', { exact: true }).fill(item.readback);
      if (index === 10) {
        await page.reload(); await runner.waitFor({ state: 'visible' });
        require(await active().getByLabel('Your diagram', { exact: true }).inputValue() === draft, 'Independent draft lost after reload');
        require(await active().getByLabel('Read it in English', { exact: true }).inputValue() === item.readback, 'Independent English draft lost after reload');
        require(await next().isDisabled(), 'Unfinished restored draft enabled next');
      }
      await active().getByRole('button', { name: 'Compare with the choices', exact: true }).click();
      await active().getByRole('button', { name: item.target, exact: true }).click();
      await active().getByRole('button', { name: item.left, exact: true }).click();
      await active().getByRole('button', { name: 'Check answer', exact: true }).click();
    }
    require(await next().isEnabled(), `Mixed question ${index + 1} correct answer did not enable next`);
    await next().click(); await intro();
  }
  require((await active().innerText()).includes(authored.fresh.sentence), 'Fresh qualification follow-up missing');
  await active().getByRole('button', { name: authored.fresh.options[authored.fresh.correct], exact: true }).click();
  await active().getByRole('button', { name: 'Check answer', exact: true }).click();
  await next().click();
  await runner.getByRole('heading', { name: 'Review your practice', exact: true }).waitFor();
  require((await runner.locator('.omd-summary').innerText()).includes('23 of 24 correctly on your first try'), 'First-check score changed after repair');
  await page.reload(); await runner.waitFor({ state: 'visible' });
  await runner.getByRole('button', { name: 'Review my answers', exact: true }).click();
  require((await active().getByRole('status').innerText()).includes(authored.complete[0].feedback[authored.complete[0].correct]), 'Checked feedback lost in review');
  const indexUrl = new URL(base); indexUrl.searchParams.set('page', 'lessons'); indexUrl.searchParams.delete('run');
  await page.goto(indexUrl.href);
  const card = page.locator('.oc-course-path li:has(a[href*="page=mixed-practice"])'); await card.waitFor({ state: 'visible' });
  require((await card.innerText()).includes('Done'), 'Mixed course card not Done');
  return { questions: 24, freshChecks: 1, firstCorrect: 23, reload: true, review: true, status: 'Done' };
}
