'use strict';
// Cross-browser smoke checks: Chromium desktop/phone/console and WebKit iPad.
// Run: npm install --no-save playwright && npx playwright install chromium webkit
//      node tests/browser-smoke.cjs
const { chromium,webkit }=require('playwright');
const { createServer }=require('node:http');
const { readFileSync }=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const types={'/':'index.html','/index.html':'index.html',
  '/sw.js':'sw.js','/manifest.webmanifest':'manifest.webmanifest',
  '/icon.svg':'icon.svg'};
const mime={'html':'text/html','js':'application/javascript','webmanifest':'application/manifest+json','svg':'image/svg+xml'};
const server=createServer((req,res)=>{
  const file=types[(req.url||'').split('?')[0]];
  if(!file){res.writeHead(404);res.end();return;}
  const type=file.split('.').pop();
  res.writeHead(200,{'Content-Type':mime[type]||'text/plain','Cache-Control':'no-store'});
  res.end(readFileSync(path.join(root,file)));
});
async function run(){
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const url='http://127.0.0.1:'+server.address().port+'/index.html';
  const profiles=[
    {name:'Desktop Chromium',browser:chromium,width:1440,height:900,touch:false},
    {name:'Small-phone Chromium',browser:chromium,width:390,height:844,touch:true},
    {name:'iPad landscape WebKit',browser:webkit,width:1180,height:820,touch:true},
    {name:'iPad portrait WebKit',browser:webkit,width:820,height:1180,touch:true},
    {name:'Console-like Chromium gamepad',browser:chromium,width:1920,height:1080,touch:false,gamepad:true}
  ];
  let successes=0;
  const failures=[];
  for(const profile of profiles){
    let browser,context;
    try{
      browser=await profile.browser.launch({headless:true});
      context=await browser.newContext({
        viewport:{width:profile.width,height:profile.height},
        hasTouch:profile.touch,deviceScaleFactor:profile.touch?2:1
      });
      const page=await context.newPage();
      const errors=[];
      page.on('pageerror',error=>errors.push(error.message));
      if(profile.gamepad){
        await page.addInitScript(()=>{
          let buttons=Array.from({length:17},()=>({pressed:false,value:0}));
          let axes=[0,0,0,0];
          Object.defineProperty(navigator,'getGamepads',{
            configurable:true,value:()=>[{connected:true,id:'Test controller',buttons,axes}]
          });
        });
      }
      await page.goto(url,{waitUntil:'domcontentloaded'});
      await page.locator('#factoryGrid .grid-cell').first().waitFor();
      assert.equal(await page.locator('#shopItems .item').count(),42,
        'All 42 machine cards must exist');
      const width=await page.evaluate(()=>document.documentElement.scrollWidth);
      assert(width<=profile.width+8,
        'Unexpected horizontal overflow ('+width+' > '+profile.width+')');
      await page.locator('#statsToggle').click();
      assert(await page.locator('#statsPanel').evaluate(el=>el.classList.contains('open')));
      await page.locator('#closeStats').click();
      await page.locator('#shopToggle').click();
      await page.locator('#shopSearch').fill('Mighty');
      assert(await page.locator('#buyMightyDropper').isVisible());
      assert(!await page.locator('#buyDropper').isVisible());
      await page.locator('#shopSearch').fill('');
      await page.locator('#shopFilter').selectOption('logic');
      assert(await page.locator('#buyCounterGate').isVisible());
      assert(await page.locator('#buyOverflowDrain').isVisible());
      assert(await page.locator('#buyTimerGate').isVisible());
      await page.locator('#shopFilter').selectOption('all');
      await page.locator('#buyMightyDropper .item-info').click();
      assert(await page.locator('#shopInfoPanel').evaluate(el=>el.classList.contains('open')));
      await page.locator('#closeShopInfo').click();
      await page.locator('#closeShop').click();
      await page.evaluate(()=>window.tinyFactoryTesting.setBalance('1Qi'));
      await page.locator('#nextPage').click();
      assert(await page.locator('#unlockPagePanel').evaluate(el=>el.classList.contains('open')));
      await page.locator('#confirmPageUnlock').click();
      assert.match(await page.locator('#pageIndicator').innerText(),/Page 2/);
      await page.locator('#prevPage').click();
      assert.match(await page.locator('#pageIndicator').innerText(),/Page 1/);
      await page.locator('#pauseBtn').click();
      assert.equal(await page.locator('#pauseBtn').getAttribute('aria-pressed'),'true');
      await page.locator('#pauseBtn').click();
      assert.equal(await page.locator('#pauseBtn').getAttribute('aria-pressed'),'false');
      await page.locator('#zoomIn').click();
      assert.notEqual(await page.locator('#zoomLevel').innerText(),'100%');
      await page.locator('#zoomReset').click();
      assert.equal(await page.locator('#zoomLevel').innerText(),'100%');
      if(profile.gamepad){
        await page.locator('#gamepadStatus').waitFor({state:'visible',timeout:4000});
        assert.match(await page.locator('#gamepadStatus').innerText(),/Controller ready/);
      }
      await page.waitForTimeout(200);
      assert.deepEqual(errors,[],'No uncaught game script exceptions allowed');
      console.log('PASS '+profile.name);
      successes++;
    }catch(error){
      const issue=profile.name+': '+error.message;
      failures.push(issue);
      console.error('FAIL '+issue);
    }finally{
      if(context)await context.close();
      if(browser)await browser.close();
    }
  }
  console.log(successes+'/'+profiles.length+' browser profiles passed');
  if(failures.length)throw Error(failures.join('\n'));
}
run().catch(error=>{console.error(error);process.exitCode=1;})
  .finally(()=>server.close());
