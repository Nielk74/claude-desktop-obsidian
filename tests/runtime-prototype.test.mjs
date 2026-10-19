import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import fsp from 'node:fs/promises';import path from 'node:path';import os from 'node:os';import vm from 'node:vm';import{EventEmitter}from'node:events';import{createRequire}from'node:module';
import{createRuntimePrototype}from'../src/desktop/runtime-prototype.mjs';
const nodeRequire=createRequire(import.meta.url);

test('the actual preload scopes theme listeners without removing the host listener',async()=>{
 const nativeTheme=new EventEmitter();let hostUpdates=0,viewUpdates=0;nativeTheme.on('updated',()=>hostUpdates++);
 const remote={nativeTheme,app:{getVersion(){return 'Host';},getPath(){return '/host';}},session:{fromPath(){return{};},fromPartition(){return{};}}};
 const config={prefix:'demo:',resources:'C:/fixture/resources',profile:'C:/fixture/profile'};
 const window={addEventListener(){}};
 const require=name=>name==='electron'?{ipcRenderer:new EventEmitter()}:name==='module'?{createRequire:()=>name=>name==='@electron/remote'?remote:nodeRequire(name)}:nodeRequire(name);
 vm.runInNewContext(await fsp.readFile('scripts/prototypes/runtime-scope-preload.cjs','utf8'),{require,window,process:{argv:['--atelier-runtime-config='+Buffer.from(JSON.stringify(config)).toString('base64')]},Buffer,console});
 const scoped=window.require('electron').remote.nativeTheme;scoped.removeAllListeners('updated').on('updated',()=>viewUpdates++);nativeTheme.emit('updated');
 assert.equal(hostUpdates,1);assert.equal(viewUpdates,1);scoped.removeAllListeners('updated');nativeTheme.emit('updated');assert.equal(hostUpdates,2);assert.equal(viewUpdates,1);
});

test('scope IPC replies use the same namespace as renderer callbacks',async t=>{
 const root=await fsp.mkdtemp(path.join(os.tmpdir(),'atelier-runtime-'));t.after(()=>fsp.rm(root,{recursive:true,force:true}));
 class Contents extends EventEmitter{send(){}getURL(){return'app://obsidian.md/index.html';}isDestroyed(){return this.destroyed===true;}close(){this.destroyed=true;}}
 class Window extends EventEmitter{constructor(){super();this.webContents=new Contents();}isDestroyed(){return false;}close(){this.emit('closed');}}
 class View{constructor(){this.webContents=new Contents();}setBounds(){}setVisible(){}getVisible(){return true;}}
 const ipcMain=new EventEmitter(),electron={app:new EventEmitter(),BrowserWindow:Window,WebContentsView:View,webContents:{getFocusedWebContents(){return null;}},session:{fromPath:()=>({protocol:{}}),fromPartition:()=>({})},Menu:class{},ipcMain};
 const source='module.exports=function(){const e=require("electron");new e.BrowserWindow();e.ipcMain.on("request-url",(event,callback)=>event.reply(callback,"answer"));}';
 const fixtureRequire=name=>name==='@electron/remote/main'?{initialize(){},enable(){}}:name==='./package.json'?{version:'1.14.4'}:nodeRequire(name);
 const require=name=>name==='electron'?electron:name==='fs'?{...fs,readFileSync:(file,...args)=>file.endsWith(path.join('obsidian.asar','main.js'))?source:fs.readFileSync(file,...args)}:name==='module'?{createRequire:()=>fixtureRequire}:nodeRequire(name);
 const module={exports:{}};vm.runInNewContext(await fsp.readFile('scripts/prototypes/runtime-scope.cjs','utf8'),{require,module,process,Buffer,console,__dirname:path.resolve('scripts/prototypes')});
 let hostDestroyed=false;const host=new EventEmitter();host.isDestroyed=()=>hostDestroyed;Object.defineProperty(host,'contentView',{get(){if(hostDestroyed)throw new Error('Object has been destroyed');return{addChildView(){},removeChildView(){}};}});
 const scope=module.exports({host,root,vault:path.join(root,'vault'),installed:root,prefix:'demo:',log(){},bounds:()=>({x:0,y:0,width:800,height:600})});
 let replied;ipcMain.emit('demo:request-url',{sender:scope.getView().webContents,reply:(channel,value)=>{replied={channel,value};}},'callback-123');
 assert.deepEqual(replied,{channel:'demo:callback-123',value:'answer'});
 hostDestroyed=true;assert.doesNotThrow(()=>host.emit('closed'),'Cleanup must not access the destroyed host content view');
});

test('closing the host during filesystem preparation cancels scope creation',async t=>{
 const root=await fsp.mkdtemp(path.join(os.tmpdir(),'atelier-runtime-close-'));t.after(()=>fsp.rm(root,{recursive:true,force:true}));
 const installed=path.join(root,'installed');await fsp.mkdir(path.join(installed,'resources','obsidian.asar'),{recursive:true});await fsp.writeFile(path.join(installed,'resources','obsidian.asar','main.js'),'fixture','utf8');
 const vault=path.join(root,'vault');await fsp.mkdir(vault);await fsp.writeFile(path.join(vault,'Home.md'),'Hello','utf8');
 let destroyed=false;const host=new EventEmitter();host.id=1;host.isDestroyed=()=>destroyed;
 const request=createRuntimePrototype({project:root,defaultVault:vault,installed});const opening=request(host,'runtime.prototype.show');destroyed=true;host.emit('closed');
 await assert.rejects(opening,/closed/i);
});
