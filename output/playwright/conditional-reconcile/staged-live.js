async (page) => {
  const base = new URL(page.url());
  const banks = await page.evaluate(async () => {
    const authored = await import('/src/bootcamps/conditionals/components/StagedReasoningDrill.tsx');
    return { sufficient: authored.sufficientStagedItems, contrapositive: authored.contrapositiveStagedItems };
  });
  const require = (condition, message) => { if (!condition) throw new Error(message); };
  const report = [];
  for (const mode of ['sufficient', 'contrapositive']) {
    const destination = new URL(base);
    destination.searchParams.set('page', `${mode}-practice`);
    destination.searchParams.set('run', '1');
    await page.goto(destination.href);
    const runner = page.locator('.oc-course-body:not([hidden]) .sr-run');
    await runner.waitFor({ state: 'visible' });
    const items = banks[mode];
    require((await runner.locator('.sr-counter b').innerText()).trim() === '01', `${mode}: requires a fresh first question`);
    require((await runner.locator('.sr-step-label').innerText()).includes('STEP 1 '), `${mode}: requires a fresh first step`);
    let drafts = 0;
    for (let i = 0; i < items.length; i++) {
      for (let s = 0; s < items[i].stages.length; s++) {
        const stage = items[i].stages[s];
        require((await runner.locator('.sr-active h2').innerText()) === stage.prompt, `${mode} question ${i + 1} step ${s + 1}: prompt mismatch`);
        const next = runner.locator('.sr-navigation').getByRole('button', { name: /Next step|Next question|Review this set/ });
        if (stage.options) {
          const options = runner.getByRole('group', { name: 'Answer choices' }).getByRole('button');
          if (i === 0 && s === 0) {
            require(await next.isDisabled(), `${mode}: unchecked answer advanced`);
            const wrong = (stage.correct + 1) % stage.options.length;
            for (let attempt = 0; attempt < 2; attempt++) {
              await options.nth((stage.order ?? stage.options.map((_, index) => index)).indexOf(wrong)).click();
              await runner.getByRole('button', { name: 'Check this step', exact: true }).click();
              require(await next.isDisabled(), `${mode}: wrong answer advanced`);
              require((await runner.locator('.sr-feedback p').innerText()).trim().length > 5, `${mode}: wrong hint missing`);
              await runner.getByRole('button', { name: 'Try again', exact: true }).click();
            }
          }
          await options.nth((stage.order ?? stage.options.map((_, index) => index)).indexOf(stage.correct)).click();
          await runner.getByRole('button', { name: 'Check this step', exact: true }).click();
        } else {
          const written = `My independent readback: ${stage.model}`;
          require(await runner.getByRole('button', { name: /Compare my sentence|Compare my explanation/ }).isDisabled(), `${mode}: empty writing compared`);
          await runner.getByRole('textbox').fill(written);
          if (drafts === 0) {
            await page.reload();
            await runner.waitFor({ state: 'visible' });
            require(await runner.getByRole('textbox').inputValue() === written, `${mode}: draft lost after reload`);
          }
          await runner.getByRole('button', { name: /Compare my sentence|Compare my explanation/ }).click();
          require(await next.isDisabled(), `${mode}: self-review was credited automatically`);
          require((await runner.locator('.sr-model').innerText()).includes(stage.model), `${mode}: model changed meaning`);
          await runner.getByRole('button', { name: 'I compared the direction and complete conditions', exact: true }).click();
          drafts++;
        }
        require(await next.isEnabled(), `${mode} question ${i + 1} step ${s + 1}: correct check did not enable next`);
        await next.click();
      }
    }
    await runner.getByRole('heading', { name: 'You worked through the set.' }).waitFor();
    require((await runner.locator('.sr-results').innerText()).includes(`${items.length} of ${items.length} questions completed`), `${mode}: result total incorrect`);
    await runner.getByRole('button', { name: 'Question 1', exact: true }).click();
    require((await runner.locator('.sr-feedback').innerText()).length > 5, `${mode}: review lost checked response`);
    await page.reload();
    require((await runner.locator('.sr-feedback').innerText()).length > 5, `${mode}: review lost response after reload`);
    const indexUrl = new URL(base); indexUrl.searchParams.set('page', 'lessons'); indexUrl.searchParams.delete('run');
    await page.goto(indexUrl.href);
    const card = page.locator(`.oc-course-path li:has(a[href*="page=${mode}-practice"])`);
    await card.waitFor({ state: 'visible' });
    require((await card.innerText()).includes('Done'), `${mode}: course card is not Done`);
    report.push({ mode, questions: items.length, writtenComparisons: drafts, wrongHints: 2, reload: true, review: true, status: 'Done' });
  }
  return report;
}

