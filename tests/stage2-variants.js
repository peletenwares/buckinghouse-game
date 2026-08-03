// Proxy FIEL (16 ms, sin latencia) de una partida humana de Stage 2 con controles
// normales (ArrowRight/Space vía eventos). Carga los MISMOS módulos que
// stage2-dev.html; sin teclas de debug, sin hooks, sin cambios de estado forzados.
//
// Uso:  node tests/stage2-variants.js [clean|errors|missmicro|all] [trials]
// Verifica que las tres formas de jugar completan INTRO→…→COMPLETE dentro de 60 s.
const fs = require('fs'), vm = require('vm'), path = require('path');
const REPO = path.join(__dirname, '..');
const ARG = process.argv[2] || 'all';
const TRIALS = parseInt(process.argv[3] || '6', 10);

function mk(){const g={addColorStop(){}};const b={canvas:{width:1280,height:720},createLinearGradient:()=>g,createRadialGradient:()=>g,createPattern:()=>({}),measureText:()=>({width:42}),getImageData:()=>({data:[]})};return new Proxy(b,{get(t,k){return k in t?t[k]:function(){};},set(t,k,v){t[k]=v;return true;}});}
function el(){return{style:{cssText:'',transform:'',setProperty(){}},dataset:{},textContent:'',addEventListener(){},removeEventListener(){},setPointerCapture(){},releasePointerCapture(){},appendChild(){},removeChild(){},remove(){},getContext:mk,getBoundingClientRect:()=>({left:0,top:0,width:1280,height:720}),parentNode:null,classList:{add(){},remove(){},toggle(){}},width:0,height:0,id:''};}
function load(){
  const L={};const win={addEventListener(t,f){(L[t]=L[t]||[]).push(f);},removeEventListener(){},innerWidth:1280,innerHeight:720};
  const doc={createElement:()=>el(),getElementById:()=>null,body:{appendChild(){},removeChild(){}},addEventListener(){}};
  const sb={console,Math,Date,JSON,Array,Object,Number,String,Boolean,parseInt,parseFloat,isNaN,setTimeout:()=>0,clearTimeout:()=>{},performance:{now:()=>0},Image:class{constructor(){this.onload=null;this.onerror=null;}set src(v){this._s=v;}get src(){return this._s;}},window:win,document:doc};
  sb.globalThis=sb;vm.createContext(sb);
  let src='';for(const f of ['config.js','manifest.js','input.js','player.js','entities.js','scenes.js'])src+=fs.readFileSync(path.join(REPO,'src/stages/stage2',f),'utf8')+'\n';
  src+=';globalThis.__S2C=S2C;globalThis.__mk=makeSceneManager;';
  vm.runInContext(src,sb,{filename:'b.js'});
  return {sb,emit:(t,e)=>(L[t]||[]).forEach(f=>f(e))};
}

function runOnce(VARIANT){
  const {sb,emit}=load();
  const S2Input=sb.S2Input,S2C=sb.__S2C,ctx=mk();
  const gs={timer:60,score:0,bipCount:0,bipBonus:0,falls:0,hits:0,caughtFirstBus:false,headphonesTimer:0,checkpoint:null,stars:0,_showMsg(){}};
  const sm=sb.__mk({},null,null,null);
  S2Input.init({touch:false,upDown:false});sm.init(gs);
  const keys={};
  function setKey(code,key,on){ if(on) emit('keydown',{code,key,preventDefault(){}}); else emit('keyup',{code,key,preventDefault(){}}); keys[code]=on; }
  const dt=1/60,NON={COMPLETE:1,FAILED:1,INTRO:1};
  let prevX=0,stall=0,cool=0,hop=0,sf=0,elapsed=0,wall=0,last=sm.key,stuckAt=0,busEnter=null;
  const stallLimit=VARIANT==='errors'?9:4, coolMs=VARIANT==='errors'?0.26:0.19;
  setKey('ArrowRight','ArrowRight',true);
  for(let i=0;i<130*60;i++){
    wall+=dt;
    const sc=sm.scene, pl=(sc&&sc.getPlayer)?sc.getPlayer():null, x=pl?pl.x:prevX;
    // Dirección base
    let right=true,left=false,jump=false;
    if(sm.key==='BUS_STOP'){
      if(busEnter==null) busEnter=wall;
      const bh=(sc&&sc.boardHint)?sc.boardHint():null;
      const avoid=(VARIANT==='missmicro')&&(wall-busEnter<3.4);
      if(avoid){ right=false; left=(x>140); }
      else if(bh&&bh.open&&bh.doorX!=null){ const d=bh.doorX-x; right=d>6; left=d<-6; }
      else { const d=700-x; right=d>10; left=d<-10; }
    }
    // Salto
    stall=Math.abs(x-prevX)<0.6?stall+1:0; prevX=x;
    if(sm.key==='MOVING_PLATFORM_CROSSING'){ hop+=dt; if(hop>=0.6){jump=true;hop=0;} }
    if(stall>stallLimit) jump=true;
    if(cool>0){cool-=dt;jump=false;}
    if(jump&&sf===0){ setKey('Space',' ',true); sf=8; cool=coolMs; }   // ~130ms pulso
    if(sf>0&&--sf===0) setKey('Space',' ',false);
    // Aplicar direccion
    if(keys['ArrowRight']!==right) setKey('ArrowRight','ArrowRight',right);
    if(keys['ArrowLeft']!==left) setKey('ArrowLeft','ArrowLeft',left);

    const run=!NON[sm.key];
    if(run){ gs.timer-=dt; if(gs.timer>S2C.timer.max)gs.timer=S2C.timer.max; if(gs.timer<=0){gs.timer=0;sm.transitionTo('FAILED');} elapsed+=dt; }
    if(gs.headphonesTimer>0)gs.headphonesTimer=Math.max(0,gs.headphonesTimer-dt);
    sm.update(dt); sm.draw(ctx); S2Input.tick();
    if(sm.key!==last){last=sm.key;stuckAt=wall;}
    if(sm.key==='COMPLETE') return {ok:true,elapsed,left:gs.timer,falls:gs.falls,hits:gs.hits,micro1:gs.caughtFirstBus};
    if(sm.key==='FAILED') return {ok:false,reason:'FAILED',elapsed,left:gs.timer,falls:gs.falls};
    if(wall-stuckAt>25) return {ok:false,reason:'STUCK@'+sm.key,elapsed,left:gs.timer,falls:gs.falls};
  }
  return {ok:false,reason:'TIMEOUT',elapsed,left:gs.timer,falls:gs.falls};
}

const variants = (ARG === 'all') ? ['clean', 'errors', 'missmicro'] : [ARG];
let totalFail = 0;
for (const V of variants) {
  let fails = 0, tmin = 99, tmax = 0;
  for (let i = 0; i < TRIALS; i++) {
    const r = runOnce(V);
    console.log((r.ok ? 'PASS' : 'FAIL') + ' ' + V.padEnd(9) + ' #' + (i + 1) + ' — ' +
      (r.ok ? ('completó ' + r.elapsed.toFixed(1) + 's, quedaban ' + r.left.toFixed(1) + 's, caídas ' + r.falls + ', 1ª micro ' + r.micro1)
            : (r.reason + ' (caídas ' + r.falls + ')')));
    if (!r.ok) fails++; else { tmin = Math.min(tmin, r.elapsed); tmax = Math.max(tmax, r.elapsed); }
  }
  console.log('  → ' + V + ': ' + (TRIALS - fails) + '/' + TRIALS + (fails ? ' — ' + fails + ' fallaron' : ' OK (' + tmin.toFixed(1) + '–' + tmax.toFixed(1) + 's)') + '\n');
  totalFail += fails;
}
console.log(totalFail ? ('FALLARON ' + totalFail + ' partidas.') : 'OK — las tres variantes completan dentro de 60 s.');
process.exit(totalFail ? 1 : 0);
