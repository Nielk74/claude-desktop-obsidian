// Private diagnostics/control for the disposable, task-owned Obsidian runtime.
const fs=require('fs'),path=require('path');
const {app,BrowserWindow}=require('electron');
const config=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../../../prototype.json'),'utf8'));
if(process.env.ATELIER_OBSIDIAN_VIEW_SPIKE==='1')require(path.join(config.root,'../../scripts/prototypes/runtime-view-host.cjs'))(config);
app.setAsDefaultProtocolClient=()=>false;
app.setPath('userData',config.profile);app.setPath('sessionData',path.join(config.profile,'session'));app.setPath('crashDumps',path.join(config.profile,'crashes'));
const record={prototype:true,pid:process.pid,vault:config.vault,windows:[],errors:[],console:[]};
function write(){try{fs.writeFileSync(config.probeFile+'.tmp',JSON.stringify(record,null,2));fs.renameSync(config.probeFile+'.tmp',config.probeFile);}catch{}}
function error(message){record.errors.push({message:String(message)});record.errors=record.errors.slice(-30);write();}
const timeout=(promise,label)=>Promise.race([promise,new Promise((_,reject)=>setTimeout(()=>reject(new Error(label+' timed out after 5 seconds')),5000))]);
write();
async function snapshot(win,info,label){
 if(win.isDestroyed())return;
 info.visible=win.isVisible();info.loading=win.webContents.isLoading();info.rendererPid=win.webContents.getOSProcessId();info.lastSnapshot=label;write();
 try{const image=await timeout(win.webContents.capturePage(undefined,{stayHidden:true,stayAwake:true}),'Capture');const file=path.join(config.root,'runtime-'+win.id+'-'+label+'.png');fs.writeFileSync(file,image.toPNG());info.captures.push(file);write();}catch(e){error(e.message);}
 try{info.state=await timeout(win.webContents.executeJavaScript('({title:document.title,hasApp:!!window.app,layoutReady:!!window.app?.workspace?.layoutReady,activeFile:window.app?.workspace?.getActiveFile()?.path,viewType:window.app?.workspace?.activeLeaf?.view?.getViewType(),bodyText:document.body.innerText.slice(0,500)})'),'Renderer readiness');write();}catch(e){error(e.message);}
}
app.on('browser-window-created',(_event,win)=>{
 const info={id:win.id,handle:win.getNativeWindowHandle().readBigUInt64LE().toString(),url:'',captures:[]};record.windows.push(info);write();
 win.setSkipTaskbar(true);win.webContents.setBackgroundThrottling(false);
 win.on('closed',()=>{info.closed=true;write();});
 win.on('show',()=>{if(!fs.existsSync(config.visibleFile))win.hide();});
 win.webContents.on('console-message',(_e,level,message)=>{record.console.push({level,message:String(message).slice(0,1500)});record.console=record.console.slice(-20);write();});
 win.webContents.on('render-process-gone',(_e,details)=>error('Renderer exited: '+JSON.stringify(details)));
 win.webContents.on('did-fail-load',(_e,code,description)=>error(code+': '+description));
 win.webContents.on('did-finish-load',()=>{info.url=win.webContents.getURL();write();if(info.url.includes('index.html'))for(const delay of [2000,8000])setTimeout(()=>void snapshot(win,info,String(delay)),delay);});
});
app.on('window-all-closed',()=>app.quit());
const commandFile=path.join(config.root,'command.json');let lastCommand;
fs.watchFile(commandFile,{interval:300},async()=>{
 let command;try{command=JSON.parse(fs.readFileSync(commandFile,'utf8'));}catch{return;}
 if(!command.id||command.id===lastCommand)return;lastCommand=command.id;
 if(command.action==='quit'){app.quit();return;}
 const win=BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes('index.html')),info=win&&record.windows.find(w=>w.id===win.id);if(!win||!info)return;
 if(command.action==='capture')await snapshot(win,info,'requested');
 if(command.action==='open'){
  if(typeof command.path!=='string'||command.path.startsWith('/')||command.path.includes('\\')||command.path.split('/').some(p=>p==='..'||p.startsWith('.'))){error('Refused prototype path.');return;}
  const target=path.resolve(config.vault,...command.path.split('/'));if(!target.startsWith(config.vault+path.sep)||!fs.existsSync(target)){error('Prototype file missing.');return;}
  try{await timeout(win.webContents.executeJavaScript('window.app.workspace.openLinkText('+JSON.stringify(command.path)+',"",false)'),'Open note');await snapshot(win,info,'open');}catch(e){error(e.message);}
 }
});
