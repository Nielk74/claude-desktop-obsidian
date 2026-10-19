// Throwaway same-process Electron view experiment. Never touches installed apps.
const fs=require('fs'),path=require('path');
const {app,BrowserWindow,WebContentsView,ipcMain}=require('electron');
module.exports=function(config){
 const record={prototype:true,kind:'same-process-electron-view',pid:process.pid,events:[]};
 const log=(event,extra={})=>{record.events.push({time:new Date().toISOString(),event,...extra});record.events=record.events.slice(-40);fs.writeFileSync(path.join(config.root,'view-host.json'),JSON.stringify(record,null,2));};
 let host,guest,view,expanded=true,closed=false;
 const size=()=>{if(!host||host.isDestroyed()||!view)return;const [w,h]=host.getContentSize(),width=expanded?w-240:Math.min(620,w-240);view.setBounds({x:expanded?240:w-width,y:76,width,height:Math.max(1,h-76)});};
 async function capture(){
  if(!view||view.webContents.isDestroyed())return;
  const image=await Promise.race([view.webContents.capturePage(),new Promise((_,reject)=>setTimeout(()=>reject(new Error('Embedded view capture timed out')),8000))]);fs.writeFileSync(path.join(config.root,'view-embedded.png'),image.toPNG());
  const state=await view.webContents.executeJavaScript('({ready:!!window.app?.workspace?.layoutReady,file:window.app?.workspace?.getActiveFile()?.path,type:window.app?.workspace?.activeLeaf?.view?.getViewType(),width:innerWidth,height:innerHeight})');
  log('capture',{state,bounds:view.getBounds(),imageBytes:image.toPNG().length});
 }
 async function attach(win){
  if(closed||host||win.isDestroyed())return;
  const ready=await win.webContents.executeJavaScript('!!window.app?.workspace?.layoutReady');
  if(!ready){setTimeout(()=>void attach(win).catch(e=>log('error',{message:e.stack})),300);return;}
  guest=win;host=win;const runtimeUrl=win.webContents.getURL();
  log('create-fresh-view',{electron:process.versions.electron,runtimeUrl});
  fs.writeFileSync(config.visibleFile,'same-process Electron experiment');
  view=new WebContentsView({webPreferences:{nodeIntegration:true,nodeIntegrationInWorker:true,contextIsolation:false,sandbox:false,webviewTag:true,backgroundThrottling:false}});
  require(path.join(config.root,'app/resources/app.asar/node_modules/@electron/remote/main')).enable(view.webContents);
  view.webContents.on('console-message',(_event,details)=>{if(details?.level==='error')log('renderer-error',{message:details.message});});
  view.webContents.on('render-process-gone',(_event,details)=>log('renderer-gone',details));
  host.setTitle('Atelier — Electron view experiment (not Claude)');host.setSize(1420,940);
  host.setMenuBarVisibility(false);
  host.webContents.on('will-prevent-unload',event=>event.preventDefault());
  host.on('closed',()=>{closed=true;log('closed');if(view&&!view.webContents.isDestroyed())view.webContents.close();});host.on('resize',size);
  await host.loadURL('data:text/html;charset=utf-8,'+encodeURIComponent('<!doctype html><html><head><meta charset="utf-8"><title>Electron view experiment</title><style>*{box-sizing:border-box}body{margin:0;background:#141414;color:#e8e5df;font:14px Segoe UI}aside{width:240px;padding:24px 16px;height:100vh;background:#111;border-right:1px solid #333}h2{font:600 18px Segoe UI}button{display:block;width:100%;border:1px solid #444;border-radius:7px;background:#26232c;color:#ddd;padding:11px;margin:9px 0;text-align:left;cursor:pointer}header{position:absolute;left:240px;right:0;top:0;height:76px;padding:16px;background:#24202b}small{display:block;color:#b8a2dc;margin-top:5px}</style></head><body><aside><h2>Atelier · experiment</h2><p>Same-process Electron hosting</p><button id="obsidian">◇ Obsidian</button><button id="layout">Dock / expand</button><button id="close">Close experiment</button><p>This window is separate from Claude.</p></aside><header>Actual installed Obsidian renderer<small>Disposable copied vault · Electron WebContentsView</small></header></body></html>'));
  host.contentView.addChildView(view);size();view.setVisible(true);host.show();
  await view.webContents.loadURL(runtimeUrl);
  await host.webContents.executeJavaScript('for(const id of ["layout","close"])document.getElementById(id).addEventListener("click",()=>require("electron").ipcRenderer.send("atelier:view-spike",id));');
  log('attached',{hostId:host.id,guestId:guest.id,viewType:view.constructor.name,hostHandle:host.getNativeWindowHandle().readBigUInt64LE().toString()});
  setTimeout(()=>void capture().catch(e=>log('capture-error',{message:e.stack})),1000);
 }
 app.on('browser-window-created',(_event,win)=>{win.webContents.on('did-finish-load',()=>{if(win.webContents.getURL().includes('obsidian.md/index.html'))void attach(win).catch(e=>log('error',{message:e.stack}));});});
 ipcMain.on('atelier:view-spike',(event,action)=>{if(!host||event.sender!==host.webContents)return;if(action==='close')host.close();else if(action==='layout'){expanded=!expanded;size();void capture().catch(e=>log('capture-error',{message:e.stack}));}});
 const commandFile=path.join(config.root,'view-command.json');let commandId;
 fs.watchFile(commandFile,{interval:300},async()=>{let c;try{c=JSON.parse(fs.readFileSync(commandFile,'utf8'));}catch{return;}if(!c.id||c.id===commandId)return;commandId=c.id;try{if(c.action==='quit'&&host)host.close();else if(c.action==='capture')await capture();else if(c.action==='layout'){expanded=c.expanded===true;size();await capture();}}catch(e){log('command-error',{message:e.stack});}});
 log('initializing');
};
