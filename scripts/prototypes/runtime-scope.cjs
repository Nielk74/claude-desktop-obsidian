// Disposable compatibility experiment, not the production vault bridge.
const fs=require('fs'),path=require('path'),vm=require('vm');
const {EventEmitter}=require('events');
const {createRequire}=require('module');
const electron=require('electron');

module.exports=function createRuntimeScope(config){
 const {host,root,vault,installed,log}=config;
 const resources=path.join(installed,'resources'),runtime=path.join(resources,'obsidian.asar');
 const profile=path.join(root,'runtime-profile'),prefix=config.prefix??'atelier:runtime-spike:';
 fs.mkdirSync(profile,{recursive:true});
 const vaultId='a7e11e0000000002';
 if(!fs.existsSync(path.join(profile,'obsidian.json')))fs.writeFileSync(path.join(profile,'obsidian.json'),JSON.stringify({vaults:{[vaultId]:{path:vault,open:true,ts:Date.now()}},updateDisabled:true,frame:'native'}),'utf8');
 const runtimeSession=electron.session.fromPath(path.join(profile,'session'));
 const originalRequire=createRequire(path.join(resources,'app.asar','main.js'));
 if(originalRequire('./package.json').version!=='1.14.4')throw new Error('The renderer prototype supports installed Obsidian 1.14.4 only.');
 const remoteMain=originalRequire('@electron/remote/main');remoteMain.initialize();
 const windows=new Set(),contents=new Map(),views=new Map(),handlers=[],invokers=[];
 let disposed=false,currentView;
 const appEvents=new EventEmitter(),processEvents=new EventEmitter();
 const bind=(target,key)=>typeof target[key]==='function'?target[key].bind(target):target[key];
 const dispose=()=>{if(disposed)return;disposed=true;appEvents.emit('before-quit');for(const win of windows)win.close();appEvents.emit('will-quit');for(const [channel,handler]of handlers)electron.ipcMain.removeListener(channel,handler);for(const channel of invokers)electron.ipcMain.removeHandler(channel);};
 host.on('closed',dispose);
 const appProxy=new Proxy(appEvents,{get(target,key){
  if(key==='name')return 'obsidian';if(key==='getVersion')return()=> '1.14.4';
  if(key==='getPath')return name=>name==='userData'?profile:electron.app.getPath(name);
  if(key==='requestSingleInstanceLock'||key==='isDefaultProtocolClient')return()=>true;
  if(key==='whenReady')return()=>({then(onReady,onError){return electron.app.whenReady().then(()=>{if(disposed||host.isDestroyed())return;return onReady();}).catch(error=>{log('startup-error',{message:error.stack});dispose();return onError?.(error);});}});
  if(key==='setAsDefaultProtocolClient')return()=>false;
  if(key==='quit')return dispose;if(key==='relaunch'||key==='addRecentDocument'||key==='setAboutPanelOptions')return()=>{};
  if(key==='commandLine')return{appendSwitch(){},getSwitchValue(){return '';},hasSwitch(){return false;}};
  if(key in target)return bind(target,key);return bind(electron.app,key);
 }});
 const processProxy=new Proxy(Object.create(null),{get(_target,key){
  if(key==='argv')return[process.execPath];if(key==='argv0')return 'obsidian';
  if(key==='exit')return dispose;
  if(['on','once','off','removeListener','removeAllListeners','emit'].includes(key))return bind(processEvents,key);
  return bind(process,key);
 }});
 const scopedEvent=event=>new Proxy(event,{get(target,key){if(key==='reply')return(channel,...args)=>target.reply(prefix+channel,...args);return bind(target,key);},set(target,key,value){target[key]=value;return true;}});
 const ipcProxy={
  on(channel,handler){const wrapped=(event,...args)=>{if(contents.has(event.sender))handler(scopedEvent(event),...args);};handlers.push([prefix+channel,wrapped]);electron.ipcMain.on(prefix+channel,wrapped);return ipcProxy;},
  handle(channel,handler){invokers.push(prefix+channel);electron.ipcMain.handle(prefix+channel,(event,...args)=>{if(!contents.has(event.sender))throw new Error('Unowned runtime sender');return handler(scopedEvent(event),...args);});}
 };
 function RuntimeWindow(options={}){
  if(disposed||host.isDestroyed())throw new Error('The host window was closed.');
  const backing=new electron.BrowserWindow({...options,show:false,webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false}});
  const view=new electron.WebContentsView({webPreferences:{...options.webPreferences,session:runtimeSession,preload:path.join(__dirname,'runtime-scope-preload.cjs'),additionalArguments:['--atelier-runtime-config='+Buffer.from(JSON.stringify({prefix,resources,profile})).toString('base64')],sandbox:false}});
  remoteMain.enable(view.webContents);
  const rawSend=view.webContents.send.bind(view.webContents);view.webContents.send=(channel,...args)=>rawSend(prefix+channel,...args);
  let facade;
  facade=new Proxy(backing,{get(target,key){
   if(key==='webContents')return view.webContents;
   if(key==='loadURL')return(...args)=>view.webContents.loadURL(...args);
   if(key==='loadFile')return(...args)=>view.webContents.loadFile(...args);
   if(key==='show'||key==='showInactive')return()=>{currentView=view;for(const v of views.values())v.setVisible(v===view);config.onShow?.(view);};
   if(key==='hide')return()=>view.setVisible(false);
   if(key==='isVisible')return()=>view.getVisible();
   if(key==='focus')return()=>view.webContents.focus();
   if(key==='getParentWindow')return()=>null;
   return bind(target,key);
  },set(target,key,value){target[key]=value;return true;}});
  windows.add(facade);contents.set(view.webContents,facade);views.set(facade,view);host.contentView.addChildView(view);view.setBounds(config.bounds());
  backing.on('closed',()=>{if(!view.webContents.isDestroyed())view.webContents.close();if(!host.isDestroyed())host.contentView.removeChildView(view);contents.delete(view.webContents);views.delete(facade);windows.delete(facade);if(!windows.size)appEvents.emit('window-all-closed');});
  view.webContents.on('console-message',(_event,details)=>{if(details?.level==='error')log('renderer-error',{message:details.message});});
  view.webContents.on('did-fail-load',(_event,code,message)=>log('load-error',{code,message}));
  view.webContents.on('render-process-gone',(_event,details)=>log('renderer-gone',details));
  view.webContents.on('did-finish-load',()=>{log('view-loaded',{url:view.webContents.getURL()});config.onLoaded?.(view);});
  appEvents.emit('web-contents-created',{},view.webContents);
  log('view-created',{contentsId:view.webContents.id});return facade;
 }
 RuntimeWindow.fromWebContents=wc=>contents.get(wc);
 RuntimeWindow.getAllWindows=()=>[...windows];
 RuntimeWindow.getFocusedWindow=()=>contents.get(electron.webContents.getFocusedWebContents());
 const menuProxy=new Proxy(electron.Menu,{get(target,key){if(key==='setApplicationMenu')return()=>{};return bind(target,key);}});
 const sessionProxy={defaultSession:runtimeSession,fromPartition:name=>electron.session.fromPartition(prefix+name)};
 const scopedElectron=new Proxy(electron,{get(target,key){
  if(key==='app')return appProxy;if(key==='BrowserWindow')return RuntimeWindow;
  if(key==='ipcMain')return ipcProxy;if(key==='protocol')return runtimeSession.protocol;
  if(key==='session')return sessionProxy;if(key==='Menu')return menuProxy;if(key==='remote')return remoteMain;
  return bind(target,key);
 }});
 let source=fs.readFileSync(path.join(runtime,'main.js'),'utf8');
 source=source.replaceAll('obsidian-cli-','atelier-runtime-'+prefix.replace(/[^a-z0-9]/gi,'-')+'-cli-');
 const module={exports:{}};
 vm.compileFunction(source,['require','module','exports','process','__filename','__dirname'],{filename:path.join(runtime,'main.js')})(name=>name==='electron'?scopedElectron:originalRequire(name),module,module.exports,processProxy,path.join(runtime,'main.js'),runtime);
 try{module.exports(runtime,new EventEmitter());}catch(error){dispose();throw error;}
 host.on('resize',()=>{for(const view of views.values())view.setBounds(config.bounds());});
 return{dispose,getView:()=>currentView??views.values().next().value,setVisible(visible){for(const view of views.values())view.setVisible(visible);},resize(){for(const view of views.values())view.setBounds(config.bounds());}};
};
