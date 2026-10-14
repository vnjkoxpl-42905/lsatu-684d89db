async (page) => {
 const results=[];
 for(const [lesson,group,count] of [['sufficient',1,13],['necessary',2,7]]) {
  await page.goto('http://localhost:8113/dev/conditional-opening-preview?page='+lesson); await page.waitForTimeout(1000);
  const link=page.locator('.oc-course-body:not([hidden])').getByRole('link',{name:'Go to flashcards',exact:true}).first();
  await link.focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(1000);
  const h=page.getByRole('heading',{name:'Group '+group+' words',exact:true});
  const headingFocus=await h.evaluate(el=>document.activeElement===el);
  const number=await page.locator('.iw-count').innerText();
  if(!headingFocus||!number.toLowerCase().endsWith('of '+count)) throw new Error('Destination failed '+lesson+' '+number+' '+headingFocus);
  const choose=page.getByRole('button',{name:'Group '+group,exact:true}); await choose.focus(); await page.keyboard.press('Enter');
  await page.getByRole('button',{name:'Next card',exact:true}).waitFor();
  const before=await page.locator('.iw-count').innerText(); await page.reload(); await page.waitForTimeout(1000);
  const restored=await page.getByRole('button',{name:'Next card',exact:true}).count();
  await page.getByRole('button',{name:'Next card',exact:true}).focus(); await page.keyboard.press('Enter');
  const active=await page.evaluate(()=>({tag:document.activeElement.tagName,text:document.activeElement.getAttribute('aria-label')||document.activeElement.textContent.slice(0,100)}));
  if(active.tag!=='DIV'||!active.text.startsWith('Which group is')) throw new Error('Card focus failed '+JSON.stringify(active));
  results.push({lesson,headingFocus,number,before,restored,after:await page.locator('.iw-count').innerText(),active});
 }
 return results;
}


