// Test shell only. This does not run inside or change Claude.
const fs=require('fs'),path=require('path');
const {app,BrowserWindow,protocol,ipcMain}=require('electron');
const root=path.resolve(__dirname,'../../.local/obsidian-scoped-prototype');
const config=JSON.parse(fs.readFileSync(path.join(root,'prototype.json'),'utf8'));
app.setPath('userData',path.join(root,'host-profile'));app.setAsDefaultProtocolClient=()=>false;
protocol.registerSchemesAsPrivileged([{scheme:'app',privileges:{standard:true,secure:true,supportFetchAPI:true,stream:true,corsEnabled:true}}]);
const record={prototype:true,pid:process.pid,events:[]};
const log=(event,extra={})=>{record.events.push({time:new Date().toISOString(),event,...extra});record.events=record.events.slice(-60);fs.writeFileSync(path.join(root,'state.json'),JSON.stringify(record,null,2));};
process.on('uncaughtException',error=>log('uncaught',{message:error.stack}));process.on('unhandledRejection',error=>log('rejection',{message:error?.stack??String(error)}));
let quitCommand;
fs.watchFile(path.join(root,'control.json'),{interval:300},()=>{let c;try{c=JSON.parse(fs.readFileSync(path.join(root,'control.json'),'utf8'));}catch{return;}if(c.id&&c.id!==quitCommand&&c.action==='quit'){quitCommand=c.id;app.quit();}});
app.whenReady().then(async()=>{
 const host=new BrowserWindow({title:'Atelier — isolated Obsidian view experiment',width:1440,height:940,backgroundColor:'#141414',webPreferences:{contextIsolation:true,sandbox:true}});host.setMenuBarVisibility(false);
 await host.loadURL('data:text/html;charset=utf-8,'+encodeURIComponent('<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;font:14px Segoe UI;background:#141414;color:#ddd}aside{width:240px;height:100vh;box-sizing:border-box;padding:24px 16px;border-right:1px solid #444}h2{font-size:18px}header{position:absolute;top:0;left:240px;right:0;height:76px;box-sizing:border-box;padding:16px;background:#29232e}small{display:block;color:#c2a4ed;margin-top:5px}</style></head><body><aside><h2>Atelier · experiment</h2><p>Isolated Obsidian runtime</p><p>◇ Obsidian</p><p>Copied demo vault</p><p>This is a separate test window.</p></aside><header>Actual Obsidian · fresh embedded renderer<small>Private services · private profile · separate session</small></header></body></html>'));
 if(process.env.ATELIER_CLAUDE_ADAPTER_SPIKE==='1'){host.on('closed',()=>app.quit());await require('./runtime-adapter-check.cjs')(host,config,log);return;}
 let expanded=true;
 const scope=require('./runtime-scope.cjs')({host,root,vault:config.vault,installed:config.installed,log,bounds(){const [w,h]=host.getContentSize(),width=expanded?w-240:620;return{x:expanded?240:w-width,y:76,width,height:h-76};},onLoaded(view){setTimeout(()=>void capture(view).catch(e=>log('capture-error',{message:e.stack})),1500);}});
 async function capture(view=scope.getView()){
  if(!view||view.webContents.isDestroyed())return;
  const state=await view.webContents.executeJavaScript('({ready:!!window.app?.workspace?.layoutReady,file:window.app?.workspace?.getActiveFile()?.path,type:window.app?.workspace?.activeLeaf?.view?.getViewType(),body:document.body.innerText.slice(0,180),width:innerWidth,height:innerHeight})');
  log('renderer-state',{state,hostVisible:host.isVisible(),hostMinimized:host.isMinimized(),viewVisible:view.getVisible()});
  const controls=await view.webContents.executeJavaScript('Array.from(document.querySelectorAll(".workspace-ribbon,.sidebar-toggle-button,.mod-left-split .workspace-tab-header-container,.workspace-sidedock-vault-profile,.nav-header,.view-header,.canvas-control-group,.canvas-control-item,.canvas-menu")).map(el=>({classes:el.className,label:el.getAttribute("aria-label"),parent:el.parentElement?.className,width:Math.round(el.getBoundingClientRect().width),height:Math.round(el.getBoundingClientRect().height),display:getComputedStyle(el).display})).slice(0,60)');fs.writeFileSync(path.join(root,'controls.json'),JSON.stringify(controls,null,2),'utf8');
  const image=await Promise.race([view.webContents.capturePage(undefined,{stayHidden:true,stayAwake:true}),new Promise((_,reject)=>setTimeout(()=>reject(new Error('Capture timeout')),8000))]);fs.writeFileSync(path.join(root,'embedded.png'),image.toPNG());log('capture',{bytes:image.toPNG().length,bounds:view.getBounds()});
 }
 let lastCommand;
 fs.watchFile(path.join(root,'command.json'),{interval:300},async()=>{let c;try{c=JSON.parse(fs.readFileSync(path.join(root,'command.json'),'utf8'));}catch{return;}if(!c.id||c.id===lastCommand)return;lastCommand=c.id;try{if(c.action==='quit'){scope.dispose();host.close();app.quit();}else if(c.action==='capture')await capture();else if(c.action==='layout'){expanded=c.expanded===true;scope.resize();await capture();}else if(c.action==='open'&&typeof c.path==='string'&&!c.path.includes('..')&&!c.path.includes('\\')&&!c.path.startsWith('/')){await scope.getView().webContents.executeJavaScript('window.app.workspace.openLinkText('+JSON.stringify(c.path)+',"",false)');await capture();}}catch(e){log('command-error',{message:e.stack});}});
 host.on('closed',()=>app.quit());log('host-ready');
});
