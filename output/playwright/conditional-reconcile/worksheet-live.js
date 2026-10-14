async (page) => {
  const BANK = await page.evaluate(async () => {
    const source = await import('/src/bootcamps/conditionals/content/sourceWorksheetDrills.ts');
    const spans = await import('/src/bootcamps/conditionals/content/conditionSpans.ts');
    const norm = word => word.replace(/[^\p{L}\p{N}]/gu, '').toLowerCase();
    const active = source.getSourceWorksheetDrill(new URL(location.href).searchParams.get("page"));
    const sets = active ? [...source.sourceWorksheetDrills, active] : source.sourceWorksheetDrills;
    return Object.fromEntries(sets.map(set => [set.id, {kind:set.taskKind, items:set.items.map(item => {
      const tokens = item.statement.split(/\s+/).map(norm);
      const indicators = source.keyedIndicators(item).flatMap(indicator => {
        const wanted = indicator.text.split(/\s+/).map(norm);
        const start = tokens.findIndex((_, index) => wanted.every((word, offset) => tokens[index + offset] === word));
        if (start < 0) throw new Error('Missing indicator '+item.id+' '+indicator.text);
        return wanted.map((_,offset) => [start+offset,String(indicator.group)]);
      });
      return {...item, indicators, spans: ['sufficient','necessary'].map(role => spans.locateWording(item.statement, spans.conditionAnswer(item.statement,role)))};
    })}]));
  });
  const opened = new URL(page.url());
  const setId = opened.searchParams.get('page') || opened.pathname.split('/').pop();
  const set = BANK[setId];
  if (!set) throw new Error(`Open a worksheet route first; got ${setId}`);
  const from = Number(opened.searchParams.get('liveStart') || 0);
  const count = Number(opened.searchParams.get('liveCount') || 2);
  if (!Number.isInteger(from) || from < 0 || from >= set.items.length || !Number.isInteger(count) || count < 1) throw new Error('Invalid liveStart/liveCount');
  const end = Math.min(set.items.length, from + count);
  const summary = {setId, from, end, total:set.items.length, questions:[], wrongAndShowMe:false, reload:false, results:false, review:false, indexDone:false};
  const startAt = Date.now();
  const surface = () => page.locator('section.sw-experience:visible');
  const button = name => surface().getByRole('button', {name, exact:true});
  const clearIndicators = async () => {
    const group = surface().getByRole('group', {name:'Click the indicator in the rule.',exact:true});
    while (await group.locator('button[aria-pressed="true"]').count()) await group.locator('button[aria-pressed="true"]').first().click();
    return group.getByRole('button');
  };
  const clearConditions = async () => {
    const group = surface().getByRole('group', {name:'Click the first and last word of each condition.',exact:true});
    while (await group.locator('button[data-span="1"],button[data-span="2"]').count()) await group.locator('button[data-span="1"],button[data-span="2"]').first().click();
    return group.getByRole('button');
  };
  const mark = async (tokens, [first,last]) => {await tokens.nth(first).click();await tokens.nth(last).click();};
  const runUrl = new URL(opened);
  if (runUrl.pathname.includes('/dev/')) runUrl.searchParams.set('page',setId);
  runUrl.searchParams.set('run','1');
  await page.goto(runUrl.href);
  await surface().waitFor({state:'visible'});
  if (await surface().locator('.sw-results').count()) await surface().locator('.sw-review-grid button').nth(from).click();
  for (let q=from; q<end; q++) {
    const item=set.items[q];
    await surface().getByRole('combobox',{name:'Go to question',exact:true}).selectOption(String(q));
    await surface().locator('.sw-stage-rail button').first().click();
    const stages=set.kind==='identify'?['indicators','conditions','review']:set.kind==='roles'?['conditions','diagram','review']:set.kind==='forward'?['conditions','symbols','diagram','review']:set.kind==='rephrase'?['readback','indicators','diagram','review']:['indicators','conditions','symbols','diagram','contra','readback','contra-readback','review'];
    let reloaded=false, wrongChecked=false;
    const order=item.spans.map((span,index)=>({span,role:index})).sort((a,b)=>a.span[0]-b.span[0]);
    const sufficientSymbol=order[0].role===0?'A':'B';
    const necessarySymbol=sufficientSymbol==='A'?'B':'A';
    for (let n=0;n<stages.length;n++) {
      const stage=stages[n];
      await surface().locator('.sw-stage-rail button').nth(n).click();
      if (q===0 && !wrongChecked && (stage==='indicators'||stage==='conditions')) {
        if (stage==='indicators') {
          const tokens=await clearIndicators();
          const expected=new Set(item.indicators.map(x=>x[0]));
          const wrong=item.statement.split(/\s+/).findIndex((_,i)=>!expected.has(i));
          await tokens.nth(wrong).click();
          await surface().locator('.sw-indicator-groups select').first().selectOption('1');
        } else {
          const tokens=await clearConditions();await mark(tokens,[0,0]);await mark(tokens,[1,1]);
        }
        await button('Check this step').click();
        await surface().getByRole('heading',{name:'Make one adjustment.',exact:true}).waitFor();
        await button('Revise this step').click();await button('Check this step').click();
        await button('Show me').click();
        const answer=(await surface().locator('.sw-shown').innerText()).trim();
        if (!answer || answer===';') throw new Error(`${item.id}: empty Show me`);
        summary.wrongAndShowMe=true;wrongChecked=true;
        await button('Revise this step').click();
      }
      if (stage==='indicators') {
        const tokens=await clearIndicators();
        const picked=[...item.indicators].sort((a,b)=>a[0]-b[0]);
        for (const [index] of picked) await tokens.nth(index).click();
        const runs=[];
        for (const [index,group] of picked) {
          const last=runs[runs.length-1];
          if(last && index===last.last+1) {if(last.group!==group) throw new Error('Adjacent indicators require different groups');last.last=index;}
          else runs.push({last:index,group});
        }
        const selects=surface().locator('.sw-indicator-groups select');
        for(let i=0;i<runs.length;i++) await selects.nth(i).selectOption(runs[i].group);
      } else if(stage==='conditions') {
        let tokens=await clearConditions();
        await mark(tokens,order[0].span);
        if(q===0&&!reloaded) {
          await page.reload();await surface().waitFor({state:'visible'});
          const text=await surface().locator('.sw-span-status').innerText();
          if(!text.includes('Condition 1:')) throw new Error(`${item.id}: highlighted draft did not survive reload`);
          tokens=surface().getByRole('group',{name:'Click the first and last word of each condition.',exact:true}).getByRole('button');
          summary.reload=true;reloaded=true;
        }
        await mark(tokens,order[1].span);
      } else if(stage==='symbols') {
        await surface().getByLabel('First condition’s symbol',{exact:true}).fill('A');
        await surface().getByLabel('Second condition’s symbol',{exact:true}).fill('B');
      } else if(stage==='diagram') {
        const production=set.kind==='forward'||set.kind==='contrapositive';
        await surface().getByRole('group',{name:'Left: sufficient condition',exact:true}).getByRole('button',{name:production?sufficientSymbol:item.sufficient,exact:true}).click();
        await surface().getByRole('group',{name:'Right: necessary condition',exact:true}).getByRole('button',{name:production?necessarySymbol:item.necessary,exact:true}).click();
      } else if(stage==='contra') {
        await surface().getByLabel('NOT on the left side',{exact:true}).uncheck();
        await surface().getByLabel('NOT on the right side',{exact:true}).uncheck();
        await surface().getByRole('group',{name:'Left side',exact:true}).getByRole('button',{name:necessarySymbol,exact:true}).click();
        await surface().getByRole('group',{name:'Right side',exact:true}).getByRole('button',{name:sufficientSymbol,exact:true}).click();
        await surface().getByLabel('NOT on the left side',{exact:true}).check();
        await surface().getByLabel('NOT on the right side',{exact:true}).check();
      } else if(stage==='readback'||stage==='contra-readback') {
        const text=stage==='readback'?item.ifThen:item.contrapositiveWords;
        await surface().getByRole('textbox').fill(text);
        if(q===0&&!reloaded) {await page.reload();await surface().waitFor({state:'visible'});if(await surface().getByRole('textbox').inputValue()!==text)throw new Error('Written draft lost on reload');summary.reload=true;reloaded=true;}
      } else if(stage==='review') {
        const beforeReview=Number(await surface().getByRole('progressbar').getAttribute('aria-valuenow'));
        await button('My reasoning matched').click();
        if(Number(await surface().getByRole('progressbar').getAttribute('aria-valuenow'))!==beforeReview+1) throw new Error(`${item.id}: review count did not advance`);
        summary.questions.push({index:q,id:item.id,reviewed:true});
        continue;
      }
      const deferred=stage==='symbols'||stage==='readback'||stage==='contra-readback';
      if(deferred) await button('Save and continue').click();
      else {
        await button('Check this step').click();
        await surface().getByRole('heading',{name:'Correct.',exact:true}).waitFor();
        await button('Continue').click();
      }
    }
  }
  if(end===set.items.length) {
    await button('Review this set').click();
    await surface().getByRole('heading',{name:'Every question reviewed.',exact:true}).waitFor();
    summary.results=true;
    await surface().locator('.sw-review-grid button').first().click();
    await surface().getByRole('combobox',{name:'Go to question',exact:true}).waitFor();summary.review=true;
    const index=new URL(runUrl);index.searchParams.set('page','lessons');index.searchParams.delete('run');
    if(!index.pathname.includes('/dev/')) index.pathname=index.pathname.replace(/\/opening\/[^/]+$/,'/lessons');
    await page.goto(index.href);
    // Cards have a single route-specific link; locate its containing list item from its URL.
    const entry=page.locator('li').filter({has:page.locator(`a[href*="${setId}"]`)}).filter({hasText:'Done'}).first();
    await entry.waitFor({state:'visible'});summary.indexDone=true;
  }
  summary.elapsedMs=Date.now()-startAt;
  await page.locator('body').evaluate((el,result)=>el.setAttribute('data-worksheet-live-result',JSON.stringify(result)),summary);
  return summary;
}


