const {chromium}=require('../.vercel/qa/node_modules/playwright');
const fs=require('fs'),path=require('path'),assert=require('assert');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 let fail=true, rows=[{id:'a',student_name:'Test Student',user_id:'student',requested_at:'2026-10-21T13:00:00Z',mode:'Online',reason:'Study and workload',status:'pending'},{id:'b',student_name:'Other Student',requested_at:'2026-10-22T13:00:00Z',mode:'In person',reason:'General wellbeing',status:'confirmed'}];
 await page.route('https://stillwell.test/**',route=>{
  const url=new URL(route.request().url());
  if(url.pathname==='/api') {
   const kind=url.searchParams.get('kind'),target=url.searchParams.get('path')||'';
   if(kind==='ai-config')return route.fulfill({json:{personalChatEnabled:false}});
   if(kind==='staff-login')return route.fulfill({status:fail?401:200,json:fail?{error:'Incorrect username or password.'}:{access_token:'test',refresh_token:'test',expires_in:3600,user:{id:'staff'}}});
   if(target.includes('rpc/set_appointment_status')) {const b=route.request().postDataJSON();rows.find(a=>a.id===b.appointment_id).status=b.new_status;return route.fulfill({json:null});}
   if(target.includes('profiles'))return route.fulfill({json:[{id:'staff',role:'counselor',display_name:'Counseling Admin'}]});
   return route.fulfill({json:target.includes('appointments')?rows:[]});
  }
  const file=path.resolve('dist',url.pathname==='/'?'index.html':url.pathname.slice(1));
  return route.fulfill({body:fs.readFileSync(file),contentType:file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html'});
 });
 await page.goto('https://stillwell.test/#staff');await page.locator('#staff-auth-form').waitFor();
 assert.equal(await page.locator('input[type="email"]').count(),0);
 await page.locator('[name=username]').fill('staff-test');await page.locator('[name=password]').fill('example-password');
 await page.locator('#staff-auth-form button').click();await page.waitForFunction(()=>document.querySelector('#toast').textContent.includes('Incorrect'));
 assert.equal(await page.locator('.staff-request').count(),0);
 fail=false;await page.locator('#staff-auth-form button').click();await page.locator('.staff-request').first().waitFor();
 assert.equal(await page.locator('.staff-request').count(),2);
 assert((await page.evaluate(()=>session.expires_at))>Date.now()/1000);
 await page.locator('[data-status=confirmed]').click();await page.waitForFunction(()=>state.appointments[0].status==='confirmed');
 await page.locator('[data-status=completed][data-id=a]').click();await page.waitForFunction(()=>state.appointments[0].status==='completed');
 await page.locator('#staff-filter').selectOption('completed');assert.equal(await page.locator('.staff-request').count(),1);
 await page.locator('#staff-filter').selectOption('active');await page.locator('[data-status=cancelled][data-id=b]').click();await page.waitForFunction(()=>state.appointments[1].status==='cancelled');
 await page.locator('#staff-filter').selectOption('all');await page.locator('[data-action=staff-refresh]').click();
 for(const width of [1440,390]){await page.setViewportSize({width,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:`.vercel/qa/staff-${width}.png`,fullPage:true});}
 await page.reload();await page.locator('.staff-toolbar').waitFor();assert.equal(await page.evaluate(()=>state.page),'counselor');
 await page.evaluate(()=>{state.role='student';render()});assert.equal(await page.locator('.staff-request').count(),0);assert.match(await page.locator('main').textContent(),/authorized staff/);
 assert.deepEqual(errors,[]);console.log('PASS: private username login, failed login, role guard, session expiry, dashboard filters, confirm/complete/cancel, refresh/reload, desktop/mobile. Auth and database simulated.');await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
