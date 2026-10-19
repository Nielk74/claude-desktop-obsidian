// Used only by the local disposable runtime experiment.
const electron=require('electron'),path=require('path');
const config=JSON.parse(Buffer.from(process.argv.find(arg=>arg.startsWith('--atelier-runtime-config=')).split('=')[1],'base64').toString('utf8'));
const originalRequire=require('module').createRequire(path.join(config.resources,'app.asar','main.js'));
const remote=originalRequire('@electron/remote');
const themeListeners=[];
const themeProxy=new Proxy(Object.create(null),{get(_target,key){
 if(['on','addListener','once'].includes(key))return(event,listener)=>{let actual=listener;if(key==='once')actual=(...args)=>{themeProxy.removeListener(event,listener);listener(...args);};themeListeners.push({event,listener,actual});remote.nativeTheme.on(event,actual);return themeProxy;};
 if(['off','removeListener'].includes(key))return(event,listener)=>{const index=themeListeners.findLastIndex(item=>item.event===event&&item.listener===listener);if(index>=0){const item=themeListeners.splice(index,1)[0];remote.nativeTheme.removeListener(item.event,item.actual);}return themeProxy;};
 if(key==='removeAllListeners')return event=>{for(const item of [...themeListeners])if(event===undefined||item.event===event)themeProxy.removeListener(item.event,item.listener);return themeProxy;};
 return typeof remote.nativeTheme[key]==='function'?remote.nativeTheme[key].bind(remote.nativeTheme):remote.nativeTheme[key];
},set(_target,key,value){if(key==='themeSource')return true;return false;}});
window.addEventListener('unload',()=>themeProxy.removeAllListeners());
const sessionProxy={get defaultSession(){return remote.session.fromPath(path.join(config.profile,'session'));},fromPartition(name){return remote.session.fromPartition(config.prefix+name);}};
const ipc=new Proxy(electron.ipcRenderer,{get(target,key){
 if(['send','sendSync','invoke'].includes(key))return(channel,...args)=>target[key](config.prefix+channel,...args);
 if(['on','once','addListener'].includes(key))return(channel,listener)=>{target[key](config.prefix+channel,listener);return ipc;};
 if(['removeListener','off','removeAllListeners'].includes(key))return(channel,...args)=>target[key](config.prefix+channel,...args);
 return typeof target[key]==='function'?target[key].bind(target):target[key];
}});
const appProxy=new Proxy(remote.app,{get(target,key){
 if(key==='getVersion')return()=> '1.14.4';
 if(key==='getPath')return name=>name==='userData'?config.profile:target.getPath(name);
 if(key==='quit')return()=>ipc.send('atelier-close');
 if(key==='relaunch')return()=>{};
 return typeof target[key]==='function'?target[key].bind(target):target[key];
}});
let windowProxy;
const remoteProxy=new Proxy(remote,{get(target,key){
 if(key==='app')return appProxy;
 if(key==='nativeTheme')return themeProxy;
 if(key==='session')return sessionProxy;
 if(key==='getCurrentWindow')return()=>windowProxy??=(new Proxy(target.getCurrentWindow(),{get(win,name){
  if(name==='close')return()=>ipc.send('atelier-close');
  if(name==='setTitle')return()=>{};
  if(name==='setFrameZoomLevel')return level=>electron.webFrame.setZoomLevel(level);
  return typeof win[name]==='function'?win[name].bind(win):win[name];
 }}));
 return typeof target[key]==='function'?target[key].bind(target):target[key];
}});
const scopedElectron=new Proxy(electron,{get(target,key){if(key==='ipcRenderer')return ipc;if(key==='remote')return remoteProxy;return typeof target[key]==='function'?target[key].bind(target):target[key];},set(target,key,value){if(key==='remote')return true;target[key]=value;return true;}});
function scopedRequire(name){if(name==='electron')return scopedElectron;if(name==='@electron/remote')return remoteProxy;return originalRequire(name);}
Object.assign(scopedRequire,originalRequire);
Object.defineProperty(window,'require',{configurable:true,get:()=>scopedRequire,set(){}});
