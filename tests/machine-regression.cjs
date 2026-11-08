'use strict';
/* Run with: node tests/machine-regression.cjs — no npm dependencies. */
function runSuite(gameSource){
  const checks=[];
  const verify=(name,fn)=>{
    try{if(fn()!==true)throw Error('Expectation failed');checks.push({name,pass:true});}
    catch(error){checks.push({name,pass:false,error:String(error)});}
  };
  class Element{
    constructor(id='',tag='div'){
      this.id=id;this.tagName=tag.toUpperCase();this.children=[];this.parent=null;
      this.className='';this.dataset={};this.style={};this.attrs={};this.listeners={};
      this.value='';this.checked=false;this.disabled=false;this.hidden=false;
      this.textContent='';this.tabIndex=-1;this.type='';
      this.classList={
        contains:x=>this.className.split(' ').includes(x),
        add:(...xs)=>xs.forEach(x=>this.change(x,true)),
        remove:(...xs)=>xs.forEach(x=>this.change(x,false)),
        toggle:(x,v)=>this.change(x,v)
      };
    }
    change(x,flag){
      const set=new Set(this.className.split(' ').filter(Boolean));
      const on=flag===undefined?!set.has(x):!!flag;
      if(on)set.add(x);else set.delete(x);
      this.className=[...set].join(' ');return on;
    }
    appendChild(child){
      if(child.id==='fragment'){for(const node of [...child.children])this.appendChild(node);return child;}
      if(child.parent)child.parent.children=child.parent.children.filter(x=>x!==child);
      this.children.push(child);child.parent=this;return child;
    }
    append(...nodes){nodes.forEach(n=>this.appendChild(n));}
    insertBefore(child,target){
      if(child.parent)child.parent.children=child.parent.children.filter(x=>x!==child);
      const index=this.children.indexOf(target);
      if(index<0)return this.appendChild(child);
      this.children.splice(index,0,child);child.parent=this;return child;
    }
    replaceChildren(...nodes){this.children=[];this.append(...nodes);}
    get childElementCount(){return this.children.length;}
    addEventListener(event,fn){(this.listeners[event]??=[]).push(fn);}
    emit(event,extras={}){
      for(const fn of this.listeners[event]||[])
        fn({target:this,currentTarget:this,preventDefault(){},stopPropagation(){},...extras});
    }
    click(){this.emit('click');}
    focus(){}scrollIntoView(){}
    getClientRects(){return[{}];}
    getBoundingClientRect(){
      if(this.id==='top')return{bottom:85};
      if(this.id==='balance')return{bottom:55};
      if(this.id==='bar')return{top:830};
      return{left:200,right:230,top:150,bottom:180};
    }
    setAttribute(key,value){this.attrs[key]=String(value);}
    querySelector(q){
      if(q==='.item-name')return this.children.flatMap(c=>c.children)
        .find(c=>c.className==='item-name')||{textContent:this.id.slice(3)};
      return this['sub:'+q]??(this['sub:'+q]=new Element());
    }
    querySelectorAll(selector){
      const ret=[],selectors=selector.split(',').map(x=>x.trim());
      const walk=n=>{for(const c of n.children){
        if(selectors.some(s=>s.startsWith('.')?c.classList.contains(s.slice(1)):
          s==='button'&&c.tagName==='BUTTON'||s==='[role="button"]'&&c.attrs.role==='button'||
          s==='input'&&c.tagName==='INPUT'||s==='select'&&c.tagName==='SELECT'))ret.push(c);
        walk(c);
      }};
      walk(this);return ret;
    }
    closest(){return null;}
    setPointerCapture(){}releasePointerCapture(){}
    remove(){if(this.parent)this.parent.children=this.parent.children.filter(c=>c!==this);}
  }
  const old=['Dropper','Conveyor','Extractor','Turbine','HydraulicPump','Wire',
    'Purifier','Furnace','CryoChamber','LaserCutter','AdvancedDropper',
    'Splitter','Upgrader','ParticleAccelerator','SuperDropper','Sorter','ValueGate','Presser'];
  function boot(options={}){
    const storageMap=options.storageMap||new Map();
    const storage={getItem:k=>storageMap.get(k)||null,
      setItem:(k,v)=>storageMap.set(k,v),removeItem:k=>storageMap.delete(k)};
    const nodes=new Map(),get=id=>{
      if(!nodes.has(id))nodes.set(id,new Element(id));return nodes.get(id);
    };
    old.forEach(type=>{
      const card=get('buy'+type);
      card.className='item';
      card.dataset.category=['Wire','Turbine','HydraulicPump'].includes(type)?'Power':
        ['Conveyor','Sorter','Splitter','ValueGate'].includes(type)?'Transport':'Processing';
      get('shopItems').appendChild(card);
    });
    get('shopSearch').value='';get('shopFilter').value='all';get('bulkAmount').value='1';
    const top=new Element('top'),bar=new Element('bar');
    const tabs=['All','Production','Processing','Transport','Power'].map(label=>{
      const e=new Element();e.dataset.tab=label;return e;
    });
    const document={
      getElementById:get,body:new Element(),createElement:t=>new Element('',t),
      createDocumentFragment:()=>new Element('fragment'),
      querySelector:q=>q==='.topbar'?top:q==='.hotbar-wrap'?bar:null,
      querySelectorAll:q=>q==='#shopItems .item'?
        get('shopItems').children.filter(x=>x.classList.contains('item')):
        q==='.shop-tab'?tabs:q==='.storage-slot'?
        [...get('hotbar').children,...get('bagGrid').children].filter(x=>x.classList.contains('storage-slot')):[],
      addEventListener(){},elementFromPoint(){return null;}
    };
    const window={innerWidth:options.width||1200,innerHeight:options.height||950,
      visualViewport:null,addEventListener(){}};
    let clock=1000,gamepads=[];
    const navigator={getGamepads:()=>gamepads},performance={now:()=>clock};
    const source=gameSource+';return {machine,initialPrices,prices,nextMachinePrice,inventory,inventoryCosts,'+
      'placed:()=>placed,blobs:()=>blobs,factoryPages,page:()=>currentPage,stats,money:()=>money,'+
      'allDroppers,megaKeys,megaPorts,placeMegaParts,canOccupy,rootKey,rotateMachine,'+
      'newBlob,chooseDropGrade,upgradeBlob,multiplyBlob,handleBlobArrival,moveBlobs,movementDelay,'+
      'deliverPower,tickFactory,spawnBlob,purchase,travelHistory,undoStack,saveState,switchFactoryPage,'+
      'pagePurchasePrice,blobDestination,removeMachine,formatBalance,pollGamepads,gamepad:()=>gamepadConnected,grid:()=>[gridCols,gridRows],resetGame,iconFor,graphics:()=>({quality:graphicsQuality,theme:graphicsTheme,motion:graphicsMotion})};';
    const game=new Function('document','window','navigator','location','localStorage',
      'performance','ResizeObserver','setInterval','setTimeout','clearTimeout',source)(
      document,window,navigator,{protocol:'file:'},storage,performance,undefined,()=>0,()=>1,()=>{});
    return{game,get,window,document,storageMap,clock:t=>clock=t,gamepads:p=>gamepads=p};
  }
  const put=(game,key,type)=>{
    const m=game.machine(type);game.placed().set(key,m);
    if(game.megaKeys(key,type).length>1)game.placeMegaParts(key,m);
    return m;
  };
  verify('42 machine listings and Mighty price 2M',()=>{
    const a=boot();
    return a.get('shopItems').children.filter(x=>x.classList.contains('item')).length===42&&
      a.game.prices.MightyDropper===2000000n;
  });
  verify('All shop has four labeled groups with cheapest-first prices',()=>{
    const a=boot(),prices=a.game.prices,children=a.get('shopItems').children;
    const categories=['Production','Processing','Transport','Power'];
    let current=null,lastPrice=null,count=0;
    const seen=[];
    for(const child of children){
      if(child.classList.contains('shop-section-heading')){
        current=child.dataset.category;lastPrice=null;seen.push(current);
        continue;
      }
      if(!child.classList.contains('item')||child.dataset.hidden==='true')continue;
      if(child.dataset.category!==current)return false;
      const price=prices[child.id.slice(3)];
      if(lastPrice!==null&&price<lastPrice)return false;
      lastPrice=price;count++;
    }
    return count===42&&JSON.stringify(seen)===JSON.stringify(categories);
  });
  verify('Shop category pages sort by current cost and regroup after purchase',()=>{
    const a=boot(),prices=a.game.prices,tabs=a.document.querySelectorAll('.shop-tab');
    const transport=tabs.find(x=>x.dataset.tab==='Transport');
    transport.click();
    const before=a.get('shopItems').children.filter(x=>x.classList.contains('item')&&x.dataset.hidden==='false');
    if(before.length===0||before.some(x=>x.dataset.category!=='Transport'))return false;
    if(before.some((x,i)=>i>0&&prices[before[i-1].id.slice(3)]>prices[x.id.slice(3)]))return false;
    if(prices.Conveyor!==0n)return false;
    a.get('buyConveyor').click();
    if(prices.Conveyor!==50n)return false;
    const after=a.get('shopItems').children.filter(x=>x.classList.contains('item')&&x.dataset.hidden==='false');
    return after.every((x,i)=>x.dataset.category==='Transport'&&
      (i===0||prices[after[i-1].id.slice(3)]<=prices[x.id.slice(3)]))&&
      after.findIndex(x=>x.id==='buyConveyor')>0;
  });
  verify('10% scaling, no max, with fixed wires/logic',()=>{
    const g=boot().game;
    return g.nextMachinePrice('MightyDropper',2000000n)===2200000n&&
      g.nextMachinePrice('Singularity',10n**100n)===11n*10n**99n&&
      g.nextMachinePrice('Wire',10n)===10n&&g.nextMachinePrice('TimerGate',50n)===50n;
  });
  verify('Conveyor $2.5K cap',()=>{
    const g=boot().game;
    return g.nextMachinePrice('Conveyor',2499n)===2500n&&
      g.nextMachinePrice('Conveyor',2500n)===2500n;
  });
  verify('Mighty uses gold; Quantum is non-upgradable',()=>{
    const g=boot().game,b=g.newBlob('quantum','4,4');
    g.upgradeBlob(b);
    return g.chooseDropGrade('MightyDropper')==='gold'&&b.grade==='quantum';
  });
  verify('Diamond upgrades to Rainbow, never Quantum',()=>{
    const g=boot().game,b=g.newBlob('diamond','4,4');
    g.upgradeBlob(b);if(b.grade!=='rainbow')return false;
    g.upgradeBlob(b);return b.grade==='rainbow';
  });
  verify('Mighty and Infi improve processor gains',()=>{
    const g=boot().game,a=g.newBlob('gold','3,3',1000,{type:'MightyDropper'}),
      b=g.newBlob('gold','3,3',1000,{type:'InfiDropper'});
    g.multiplyBlob(a,200);g.multiplyBlob(b,200);
    return a.worth===150n&&b.worth===200n;
  });
  verify('Cleaner gives subsequent processing +15%',()=>{
    const g=boot().game;put(g,'3,3','Cleaner');
    const b=g.newBlob('diamond','3,3');
    g.handleBlobArrival(b,'3,3',1000);g.multiplyBlob(b,200);
    return b.cleaned&&b.worth===215n;
  });
  verify('Quantum Computer x50, clone, x5 later boost',()=>{
    const g=boot().game,m=put(g,'3,3','QuantumComputer'),b=g.newBlob('diamond','3,3');
    g.handleBlobArrival(b,'3,3',1000);
    if(b.worth!==5000n||m.pending.length!==1)return false;
    g.multiplyBlob(b,200);return b.worth===30000n;
  });
  verify('Cloner half unpowered; 95% powered',()=>{
    const g=boot().game,m=put(g,'4,4','Cloner'),p=g.megaPorts('4,4',m);
    g.handleBlobArrival(g.newBlob('diamond',p.entry),p.entry,1000);
    if(m.pending[0].worth!==50n)return false;
    m.charges=[3000];
    g.handleBlobArrival(g.newBlob('diamond',p.entry),p.entry,1000);
    return m.pending[1].worth===95n;
  });
  verify('Quantumifyier x5 and 5% clone roll',()=>{
    const g=boot().game,m=put(g,'6,6','Quantumifyier'),p=g.megaPorts('6,6',m);
    const old=Math.random;Math.random=()=>.01;
    try{
      const b=g.newBlob('diamond',p.entry);g.handleBlobArrival(b,p.entry,1000);
      return b.worth===500n&&m.pending.length===1;
    }finally{Math.random=old;}
  });
  verify('Infinifyer x25 and five additional clones',()=>{
    const g=boot().game,m=put(g,'2,2','Infinifyer'),p=g.megaPorts('2,2',m),
      b=g.newBlob('diamond',p.entry);
    g.handleBlobArrival(b,p.entry,1000);
    return b.worth===2500n&&m.pending.length===5;
  });
  verify('Fusion Chamber adds two blob values',()=>{
    const g=boot().game,m=put(g,'4,4','FusionChamber'),p=g.megaPorts('4,4',m);
    const a=g.newBlob('gold',p.entry),b=g.newBlob('diamond',p.entry);
    g.blobs().set(a.id,a);g.blobs().set(b.id,b);
    g.handleBlobArrival(a,p.entry,1000);g.handleBlobArrival(b,p.entry,1000);
    return m.pending.length===1&&m.pending[0].worth===150n;
  });
  verify('Singularity holds 10s and creates x1000 duplicates',()=>{
    const g=boot().game,m=put(g,'4,4','Singularity'),b=g.newBlob('gold','4,4');
    g.blobs().set(b.id,b);g.handleBlobArrival(b,'4,4',1000);g.moveBlobs(12000);
    return m.batch.length===0&&m.pending.length===1&&
      [...g.blobs().values()].some(v=>v.worth===50000n);
  });
  verify('Mega footprints cover complete machine',()=>{
    const g=boot().game;put(g,'4,4','Quantumifyier');
    return g.megaKeys('4,4','Quantumifyier').length===25&&
      g.rootKey('8,8')==='4,4'&&!g.canOccupy('4,4','DysonSphere',1);
  });
  verify('Advanced and Hyper conveyors have faster timing',()=>{
    const g=boot().game;put(g,'4,4','AdvancedConveyor');put(g,'4,5','HyperConveyor');
    return Math.abs(g.movementDelay({key:'4,4'})-250/1.5)<.01&&
      g.movementDelay({key:'4,5'})===62.5;
  });
  verify('Supercharger enhances conveyors fivefold',()=>{
    const g=boot().game;put(g,'4,4','HyperConveyor');put(g,'8,8','Supercharger');
    return g.movementDelay({key:'4,4'})===12.5;
  });
  verify('Recycler quantum yields 250 power',()=>{
    const g=boot().game;put(g,'4,4','Recycler');
    const b=g.newBlob('quantum','4,4');g.blobs().set(b.id,b);
    g.handleBlobArrival(b,'4,4',1000);
    return g.stats.powerGenerated===250&&!g.blobs().has(b.id);
  });
  verify('Fusion Reactor charges $20K each 4s cycle',()=>{
    const a=boot(),g=a.game;put(g,'4,4','FusionReactor');
    a.clock(5000);g.tickFactory();
    return g.money()===-20000n&&g.stats.powerGenerated===100;
  });
  verify('Solar Field produces power without running cost',()=>{
    const a=boot(),g=a.game;put(g,'4,4','SolarField');
    a.clock(12000);g.tickFactory();
    return g.money()===0n&&g.stats.powerGenerated>=1&&g.stats.powerGenerated<=15;
  });
  verify('Dyson Sphere fully powers connected consumers',()=>{
    const g=boot().game;put(g,'3,3','DysonSphere');
    put(g,'5,9','Wire');put(g,'5,10','Wire');
    const m=put(g,'5,11','MightyDropper');
    g.deliverPower('3,3',1000,100);
    return m.charges.length===100;
  });
  verify('Turbine emits into a single wire branch',()=>{
    const g=boot().game,m=put(g,'4,4','Turbine');m.direction=1;
    put(g,'4,5','Wire');const first=put(g,'4,6','Dropper');
    put(g,'3,4','Wire');const second=put(g,'2,4','Dropper');
    return g.deliverPower('4,4',1000,1)===1&&
      first.charges.length===1&&second.charges.length===0;
  });
  verify('Wire Lift can overlay a conveyor',()=>{
    const g=boot().game;put(g,'4,4','Conveyor');
    return g.canOccupy('4,4','WireLift',1);
  });
  verify('First three new page prices match design',()=>{
    const g=boot().game;
    return g.pagePurchasePrice(1)===50000000n&&g.pagePurchasePrice(2)===1000000000n&&
      g.pagePurchasePrice(3)===10000000000n;
  });
  verify('Multiple pages remain isolated and persist',()=>{
    const store=new Map(),a=boot({storageMap:store}),g=a.game;
    a.window.tinyFactoryTesting.setBalance('1Qa');
    a.get('nextPage').click();a.get('confirmPageUnlock').click();
    if(g.page()!==1||g.factoryPages.length!==2)return false;
    put(g,'12,12','Dropper');g.switchFactoryPage(0);
    if(g.placed().has('12,12'))return false;
    g.switchFactoryPage(1);g.saveState();
    const b=boot({storageMap:store});
    return b.game.page()===1&&b.game.placed().get('12,12')?.type==='Dropper';
  });
  verify('Bulk purchases are undoable and redoable',()=>{
    const a=boot(),g=a.game;
    a.window.tinyFactoryTesting.setBalance('1Qa');
    a.get('bulkAmount').value='3';g.purchase('MightyDropper');
    const slot=g.inventory.hotbar.indexOf('MightyDropper');
    if(slot<0||g.inventoryCosts.hotbar[slot].length!==3)return false;
    g.travelHistory();if(g.inventory.hotbar.includes('MightyDropper'))return false;
    g.travelHistory(true);return g.inventory.hotbar.includes('MightyDropper');
  });
  verify('Gamepad gracefully connects/disconnects',()=>{
    const a=boot(),g=a.game;
    const buttons=Array.from({length:17},()=>({pressed:false}));
    a.gamepads([{connected:true,buttons,axes:[0,0,0,0]}]);
    g.pollGamepads();if(!g.gamepad())return false;
    a.gamepads([]);g.pollGamepads();return !g.gamepad();
  });
  verify('Desktop, phone, iPad, console viewport shapes boot',()=>{
    return [[1920,1080],[390,844],[820,1180],[1180,820],[1280,720]].every(([width,height])=>{
      const size=boot({width,height}).game.grid();
      return size[0]>=14&&size[1]>=14;
    });
  });
  verify('Reset needs typed confirmation',()=>{
    const a=boot(),g=a.game;
    a.window.tinyFactoryTesting.setBalance('1000000');
    const money=g.money();
    a.get('resetConfirmText').value='NO';a.get('confirmReset').click();
    if(g.money()!==money)return false;
    a.get('resetConfirmText').value='RESET';a.get('confirmReset').click();
    return g.money()===0n&&g.factoryPages.length===1;
  });

  verify('Inactive factory pages continue earning while another page is displayed',()=>{
    const a=boot(),g=a.game;
    put(g,'5,5','MightyDropper');put(g,'5,6','Extractor');
    a.window.tinyFactoryTesting.setBalance('1Qa');
    a.get('nextPage').click();a.get('confirmPageUnlock').click();
    for(let n=1050;n<5500;n+=50){a.clock(n);g.tickFactory();}
    return g.page()===1&&g.stats.sold>=1&&!g.placed().has('5,5');
  });
  verify('Legacy version-1 single-page save can still load',()=>{
    const store=new Map();
    store.set('tiny-factory-save-v1',JSON.stringify({version:1,money:'1234',
      placed:[['8,8',{type:'Conveyor',direction:1,purchaseCost:'0'}]],
      prices:{Wire:'10'},hotbar:[],backpack:[],blobs:[]}));
    const g=boot({storageMap:store}).game;
    return g.money()===1234n&&g.placed().get('8,8')?.type==='Conveyor';
  });
  verify('Queued cloned products survive save and reload',()=>{
    const store=new Map(),a=boot({storageMap:store}),g=a.game;
    const m=put(g,'4,4','Cloner'),port=g.megaPorts('4,4',m);
    g.handleBlobArrival(g.newBlob('diamond',port.entry),port.entry,1000);
    a.window.tinyFactoryTesting.addMoney('1000');g.saveState();
    return boot({storageMap:store}).game.placed().get('4,4')?.pending?.[0]?.worth===50n;
  });
  verify('D-pad navigation and Start pause button work on gamepad',()=>{
    const a=boot(),g=a.game,buttons=Array.from({length:17},()=>({pressed:false,value:0}));
    a.gamepads([{connected:true,buttons,axes:[0,0,0,0]}]);g.pollGamepads();
    if(a.get('factoryGrid').querySelectorAll('.controller-cursor').length!==1)return false;
    a.clock(1250);buttons[12].pressed=true;g.pollGamepads();
    buttons[12].pressed=false;g.pollGamepads();
    buttons[9].pressed=true;g.pollGamepads();
    return a.get('pauseBtn').attrs['aria-pressed']==='true';
  });
  verify('Gamepad Y opens the shop',()=>{
    const a=boot(),g=a.game,buttons=Array.from({length:17},()=>({pressed:false,value:0}));
    a.gamepads([{connected:true,buttons,axes:[0,0,0,0]}]);g.pollGamepads();
    buttons[3].pressed=true;g.pollGamepads();
    return a.get('shopLayer').classList.contains('is-open');
  });
  verify('Solar Field emits through at most two independent wires',()=>{
    const g=boot().game;put(g,'4,4','SolarField');
    for(const c of [4,6,8]){put(g,'3,'+c,'Wire');put(g,'2,'+c,'Dropper');}
    g.deliverPower('4,4',1000,15);
    return [4,6,8].map(c=>g.placed().get('2,'+c).charges.length).filter(v=>v>0).length===2;
  });
  verify('Undo history cannot corrupt another page',()=>{
    const a=boot(),g=a.game;a.window.tinyFactoryTesting.setBalance('1Qa');
    g.purchase('Wire');if(!g.undoStack.length)return false;
    a.get('nextPage').click();a.get('confirmPageUnlock').click();
    return g.page()===1&&g.undoStack.length===0;
  });
  verify('Googolplex testing wallet survives machine purchases',()=>{
    const a=boot(),g=a.game;a.window.tinyFactoryTesting.setBalance('googolplex');
    g.purchase('MightyDropper');
    return g.formatBalance()==='1Gpx'&&g.money()===-2000000n;
  });
  verify('Dimensional Rift collects 6x6 region on successful roll',()=>{
    const g=boot().game;put(g,'7,7','DimensionalRift');
    const a=g.newBlob('gold','7,7'),b=g.newBlob('diamond','4,4');
    g.blobs().set(a.id,a);g.blobs().set(b.id,b);
    const random=Math.random;Math.random=()=>0;
    try{g.handleBlobArrival(a,'7,7',1000);
      return b.state==='collecting'&&b.worth===10000n;
    }finally{Math.random=random;}
  });
  verify('Counter Gate diverts third item, Overflow Drain avoids blockage',()=>{
    const g=boot().game,m=put(g,'6,6','CounterGate');
    put(g,'6,7','Conveyor');put(g,'7,6','Conveyor');
    m.counter=3;m.counterN=3;m.branchDir=2;
    if(g.blobDestination(g.newBlob('gold','6,6'))!=='7,6')return false;
    m.type='OverflowDrain';
    const blocked=g.newBlob('gold','6,7'),item=g.newBlob('gold','6,6');
    g.blobs().set(blocked.id,blocked);g.blobs().set(item.id,item);
    return g.blobDestination(item)==='7,6';
  });
  verify('Timer Gate chooses alternate path after configured period',()=>{
    const a=boot(),g=a.game,m=put(g,'6,6','TimerGate');
    put(g,'6,7','Conveyor');put(g,'7,6','Conveyor');
    m.branchDir=2;m.timerSeconds=1;a.clock(1500);
    return g.blobDestination(g.newBlob('gold','6,6'))==='7,6';
  });

  verify('Large processor applies value multiplier exactly once, not at its exit',()=>{
    const g=boot().game,m=put(g,'4,4','Quantumifyier'),ports=g.megaPorts('4,4',m);
    const old=Math.random;Math.random=()=>.5;
    try{
      const b=g.newBlob('diamond',ports.entry);
      g.handleBlobArrival(b,ports.entry,1000);
      const afterEntry=b.worth;
      g.handleBlobArrival(b,ports.exit,1300);
      return afterEntry===500n&&b.worth===500n&&m.pending.length===0;
    }finally{Math.random=old;}
  });
  verify('Cloner only creates one clone per passing blob',()=>{
    const g=boot().game,m=put(g,'4,4','Cloner'),p=g.megaPorts('4,4',m);
    const b=g.newBlob('diamond',p.entry);
    g.handleBlobArrival(b,p.entry,1000);
    g.handleBlobArrival(b,p.exit,1250);
    return m.pending.length===1&&m.pending[0].worth===50n;
  });

  verify('Quantum Computer clones exit connected processors instead of clogging',()=>{
    const a=boot(),g=a.game;
    put(g,'6,5','Conveyor');put(g,'6,6','QuantumComputer');
    put(g,'6,7','Conveyor');put(g,'6,8','Extractor');
    const original=g.newBlob('gold','6,6',1000);
    original.fromKey='6,5';g.blobs().set(original.id,original);
    g.handleBlobArrival(original,'6,6',1000);
    if(g.placed().get('6,6').pending[0]?.fromKey!=='6,5')return false;
    a.clock(1300);g.moveBlobs(1300);
    const clone=[...g.blobs().values()].find(blob=>blob.id!==original.id);
    if(!clone||clone.key!=='6,6'||clone.fromKey!=='6,5'||
       g.blobDestination(clone)!=='6,7')return false;
    a.clock(1600);g.moveBlobs(1600);
    if(clone.key!=='6,7')return false;
    a.clock(2100);g.moveBlobs(2100);
    if(clone.key!=='6,8'||clone.state!=='collecting')return false;
    a.clock(2500);g.moveBlobs(2500);
    return g.stats.sold===2&&g.blobs().size===0;
  });
  verify('Existing self-originating processor blobs recover without save reset',()=>{
    const a=boot(),g=a.game;
    put(g,'6,5','Conveyor');put(g,'6,6','QuantumComputer');
    put(g,'6,7','Conveyor');put(g,'6,8','Extractor');
    const legacy=g.newBlob('gold','6,6',1000);
    legacy.fromKey='6,6';legacy.blockedSince=1000;
    g.blobs().set(legacy.id,legacy);
    if(g.blobDestination(legacy)!=='6,7')return false;
    a.clock(1300);g.moveBlobs(1300);
    return legacy.key==='6,7'&&legacy.blockedSince===undefined;
  });
  verify('Extractor frees its tile immediately after collecting a blob',()=>{
    const a=boot(),g=a.game;
    put(g,'6,5','Conveyor');put(g,'6,6','Extractor');
    const finished=g.newBlob('gold','6,6',1000);
    finished.state='collecting';finished.collectAt=1500;
    const waiting=g.newBlob('normal','6,5',1000);
    g.blobs().set(finished.id,finished);g.blobs().set(waiting.id,waiting);
    a.clock(1600);g.moveBlobs(1600);
    return g.stats.sold===1&&g.blobs().size===1&&
      waiting.key==='6,6'&&waiting.state==='collecting'&&
      waiting.blockedSince===undefined;
  });
  verify('Saved self-originating clone automatically escapes after reload',()=>{
    const store=new Map(),a=boot({storageMap:store}),g=a.game;
    put(g,'6,5','Conveyor');put(g,'6,6','QuantumComputer');
    put(g,'6,7','Conveyor');put(g,'6,8','Extractor');
    const stuck=g.newBlob('gold','6,6',1000);
    stuck.fromKey='6,6';stuck.blockedSince=1000;
    g.blobs().set(stuck.id,stuck);
    a.window.tinyFactoryTesting.addMoney('1');
    g.saveState();
    const reloaded=boot({storageMap:store});
    const restored=[...reloaded.game.blobs().values()][0];
    if(!restored||restored.fromKey!=='6,6')return false;
    reloaded.clock(1300);reloaded.game.moveBlobs(1300);
    return restored.key==='6,7'&&restored.blockedSince===undefined;
  });
  verify('Singularity copies retain incoming belt and release onto conveyors',()=>{
    const a=boot(),g=a.game;
    put(g,'6,5','Conveyor');put(g,'6,6','Singularity');
    put(g,'6,7','Conveyor');put(g,'6,8','Extractor');
    const source=g.newBlob('gold','6,6',1000);
    source.fromKey='6,5';g.handleBlobArrival(source,'6,6',1000);
    a.clock(12000);g.moveBlobs(12000);
    const first=[...g.blobs().values()][0];
    if(!first||first.fromKey!=='6,5'||g.blobDestination(first)!=='6,7')return false;
    a.clock(12300);g.moveBlobs(12300);
    const outputs=[...g.blobs().values()];
    return outputs.length===2&&first.key==='6,7'&&
      outputs.every(blob=>blob.fromKey==='6,5'||blob===first)&&
      outputs.some(blob=>blob.key==='6,6'&&g.blobDestination(blob)==='6,7');
  });

  verify('All 24 advanced machines have distinct animated SVG models',()=>{
    const g=boot().game;
    const names=['FusionChamber','Quantumifyier','Cloner','Infinifyer','Cleaner',
      'QuantumComputer','MightyDropper','RainbowDropper','TurboDropper','QuantumDropper',
      'InfiDropper','FusionReactor','SolarField','Recycler','DysonSphere','AdvancedConveyor',
      'HyperConveyor','WireLift','CounterGate','OverflowDrain','TimerGate','Supercharger',
      'Singularity','DimensionalRift'];
    const art=names.map(type=>g.iconFor(type,1,true));
    return art.length===24&&new Set(art).size===24&&
      art.every(svg=>svg.includes('<svg')&&svg.includes('machine-depth')&&
        svg.includes('class="model-')&&svg.includes('</svg>'));
  });
  verify('Reactors, orbitals and portals have independent moving parts',()=>{
    const g=boot().game;
    return g.iconFor('FusionReactor').includes('model-arc')&&
      g.iconFor('Quantumifyier').includes('model-rotor-reverse')&&
      g.iconFor('DysonSphere').includes('model-rotor')&&
      g.iconFor('DimensionalRift').includes('model-portal');
  });
  verify('Large machines have custom matching panel textures',()=>{
    const g=boot().game;
    const a=g.iconFor('MegaPart',1,false,true,null,false,0,null,'SolarField',0);
    const b=g.iconFor('MegaPart',1,false,true,null,false,0,null,'DysonSphere',1);
    return a!==b&&a.includes('#174d84')&&b.includes('#ffde93');
  });
  verify('Auto graphics gives desktop Ultra and small screens Balanced',()=>{
    const desktop=boot({width:1440,height:900});
    const phone=boot({width:390,height:844});
    return desktop.game.graphics().quality==='auto'&&
      desktop.document.body.dataset.graphicsQuality==='ultra'&&
      phone.document.body.dataset.graphicsQuality==='balanced';
  });
  verify('Graphics quality, floor and motion survive save/reload',()=>{
    const store=new Map(),a=boot({storageMap:store});
    for(const [id,value]of [['graphicsQuality','minimal'],
      ['graphicsTheme','midnight'],['graphicsMotion','reduced']]){
      const control=a.get(id);control.value=value;control.emit('change',{target:control});
    }
    if(a.document.body.dataset.graphicsQuality!=='minimal'||
      a.document.body.dataset.factoryTheme!=='midnight'||
      a.document.body.dataset.graphicsMotion!=='reduced')return false;
    a.game.saveState();
    const saved=JSON.parse(store.get('tiny-factory-save-v1'));
    const reloaded=boot({storageMap:store});
    return saved.graphics.quality==='minimal'&&saved.graphics.theme==='midnight'&&
      saved.graphics.motion==='reduced'&&
      reloaded.game.graphics().quality==='minimal'&&
      reloaded.document.body.dataset.factoryTheme==='midnight';
  });

  verify('Factory production triggers visual pulse without full-board animation spam',()=>{
    const a=boot(),g=a.game;
    put(g,'4,4','FusionReactor');
    a.clock(5000);g.tickFactory();
    const columns=g.grid()[0],node=a.get('factoryGrid').children[4*columns+4];
    return !!node?.classList.contains('machine-active-pulse');
  });
  return{total:checks.length,passed:checks.filter(c=>c.pass).length,
    failures:checks.filter(c=>!c.pass),checks};
}
if(typeof module!=='undefined'){
  module.exports={runSuite};
  if(require.main===module){
    const fs=require('node:fs'),path=require('node:path');
    const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
    const match=html.match(/<script>([\s\S]*?)<\/script>/);
    if(!match)throw Error('Tiny Factory game script missing');
    const report=runSuite(match[1]);
    for(const t of report.checks)console.log((t.pass?'PASS ':'FAIL ')+t.name+(t.error?' — '+t.error:''));
    console.log(report.passed+'/'+report.total+' regression checks passed');
    if(report.failures.length)process.exitCode=1;
  }
}
