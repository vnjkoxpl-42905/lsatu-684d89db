async (page) => {
 const results=[];
 for(const route of ['sufficient','contrapositive']) {
  await page.goto('http://localhost:8113/dev/conditional-opening-preview?page='+route);
  await page.waitForTimeout(1000);
  const drill=page.locator('.oc-course-body:not([hidden]) .ct-drill').first();
  await drill.waitFor({state:'visible',timeout:20000});
  const restart=drill.getByRole('button',{name:'Try them again',exact:true}); if(await restart.count()) await restart.click();
  for(let step=0;step<4;step++) {
   const choices=drill.locator('.ct-drill-option');
   for(let j=0;j<await choices.count();j++) { if(await choices.nth(j).isDisabled()) continue;
    await choices.nth(j).focus(); await page.keyboard.press('Enter');
    if(await drill.locator('[data-state="right"]').count()) break;
   }
   const nav=drill.getByRole('button',{name:step===3?'Try them again':route==='contrapositive'?'Next rule':'Next question',exact:true});
   await nav.focus(); await page.keyboard.press('Enter');
   const check=await drill.locator('.ct-picker-question').evaluate(el=>({focused:document.activeElement===el,rule:!!document.getElementById(el.getAttribute('aria-describedby')),visible:el.getBoundingClientRect().top>=0&&el.getBoundingClientRect().bottom<=innerHeight}));
   results.push({route,step,...check});
   if(!check.focused||!check.rule||!check.visible) throw new Error(JSON.stringify(results));
  }
 }
 return results;
}



