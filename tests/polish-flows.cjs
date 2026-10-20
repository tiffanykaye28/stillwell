const {chromium}=require('../.vercel/qa/node_modules/playwright');
const fs=require('fs'),path=require('path'),assert=require('assert');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1000},acceptDownloads:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 await page.route('https://stillwell.test/**',route=>{
  const file=new URL(route.request().url()).pathname.slice(1)||'index.html';
  if(file==='config.js')return route.fulfill({body:'window.STILLWELL_CONFIG={}',contentType:'text/javascript'});
  const full=path.resolve('dist',file);return route.fulfill({body:fs.readFileSync(full),contentType:file.endsWith('.js')?'text/javascript':file.endsWith('.json')?'application/json':file.endsWith('.css')?'text/css':'text/html'});
 });
 await page.goto('https://stillwell.test/');await page.waitForFunction(()=>state.assessments.length===3);
 await page.evaluate(()=>{state.publicConfig={operator_name:'St.Cecilia - John Benedict B. Nacua',country:'Philippines',privacy_email:'johnbenedictbucao2@gmail.com',retention_notice:'Retained until deletion.'};navigate('mood')});
 assert.equal(await page.locator('.moods svg.mood-face').count(),5);
 await page.locator('[data-mood="3"]').click();await page.locator('[name=note]').fill('A synthetic note');await page.locator('#mood-form button').click();await page.locator('#modal').waitFor();await page.keyboard.press('Escape');
 await page.evaluate(()=>navigate('home'));assert.match(await page.locator('.recommendations').textContent(),/anxious/);assert(await page.locator('.recommendations [data-resource=grounding]').count());
 await page.evaluate(()=>navigate('mood'));await page.locator('[name=urgent]').check();await page.locator('#mood-form button').click();await page.locator('#modal .crisis-contact').waitFor();assert.equal(await page.locator('#modal a[href^="tel:"]').textContent(),'1800-1888-1553');await page.keyboard.press('Escape');
 await page.evaluate(()=>navigate('assessment'));await page.locator('#assessment-select').selectOption('preview-1');assert.match(await page.locator('#assessment-form').textContent(),/attention back to the present/);
 for(let i=0;i<4;i++)await page.locator(`[name=q${i}]`).selectOption('1');await page.locator('#assessment-form button').click();await page.locator('#modal').waitFor();assert.match(await page.locator('#modal').textContent(),/4 \/ 12/);await page.keyboard.press('Escape');
 await page.evaluate(()=>{state.role='admin';state.report={counts:{last30days:7,previous30days:4,waiting48h:1,profiles:3,counselors:1,resources:0,assessments:3},generated_at:new Date().toISOString()};navigate('admin')});
 await page.locator('#template-form [name=title]').fill('My new reflection');await page.locator('#template-form [name=questions]').fill('I made time to rest.\nI asked for support.');await page.locator('#template-form button').first().click();assert.equal(await page.evaluate(()=>state.assessments.length),4);
 const id=await page.evaluate(()=>state.assessments.at(-1).id);await page.locator('#template-select').selectOption(id);await page.locator('#template-form [name=title]').fill('Updated reflection');await page.locator('#template-form button').first().click();assert.equal(await page.evaluate(()=>state.assessments.length),4);
 await page.locator('[data-polish=delete-template]').click();assert.equal(await page.evaluate(()=>state.assessments.length),3);assert.equal(await page.evaluate(()=>state.results[0].questions_snapshot.length),4);
 const report=page.waitForEvent('download');await page.locator('[data-polish=export-report]').click();assert.equal((await report).suggestedFilename(),'stillwell-service-report.txt');
 await page.locator('#resource-form [name=title]').fill('Test learning guide');await page.locator('#resource-form [name=category]').fill('Learning');await page.locator('#resource-form [name=body]').fill('An educational resource.');await page.locator('#resource-form [name=url]').fill('https://www.who.int/health-topics/mental-health');await page.locator('#resource-form button').click();
 await page.evaluate(()=>{navigate('resources');openResource(state.resources[0].id)});assert.equal(await page.locator('#modal a[href^="https://"]').count(),1);await page.keyboard.press('Escape');
 await page.evaluate(()=>{state.aiPersonalChat=false;navigate('chat')});assert.equal(await page.locator('#chat-message').count(),0);await page.locator('#ai-consent').check();await page.locator('[data-topic="0"]').click();await page.waitForFunction(()=>state.messages.length===2);
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:900});
  for(const view of ['home','mood','assessment','resources','help','privacy','terms','admin','counselor']){
   await page.evaluate(view=>navigate(view),view);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),view+' overflow '+width);
   if(['home','help','admin'].includes(view))await page.screenshot({path:`.vercel/qa/polish-${view}-${width}.png`,fullPage:true});
  }
 }
 assert.deepEqual(errors,[]);console.log('PASS: mood icons, personalized suggestions, explicit urgent support, assessment selection/scoring/snapshots, multiple-template CRUD, custom resource links, aggregate report download, topic-only chat, nine routes at desktop/mobile. Local preview transport.');await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
