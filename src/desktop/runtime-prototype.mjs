// Temporary, explicitly labeled real-Obsidian demonstration using a copied vault.
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {applyDemoMinimalUi} from './minimal-ui.mjs';
import {createRuntimePreferences} from './runtime-preferences.mjs';
import {fitRuntimeBounds} from './runtime-layout.mjs';

export function createRuntimePrototype(config){
 const entries=new Map(),layouts=new WeakMap();
 const preferences=createRuntimePreferences(config.preferencesFile??path.join(config.catalogFile?path.dirname(config.catalogFile):path.join(config.project??'.','.local'),'runtime-preferences.json'),{apply:async controls=>{
  for(const [host,entry]of entries)if(entry.vault&&!entry.cancelled&&!host.isDestroyed())await applyDemoMinimalUi(config.project,entry.vault,{restore:controls==='all'});
 }});
 return async function request(window,action,args={}){
  if(!config?.project)throw new Error('The actual Obsidian prototype is not configured.');
  if(action==='runtime.preferences.get')return preferences.get();
  if(action==='runtime.preferences.set')return preferences.set(args.controls);
  if(!window)throw new Error('The Claude window could not be found.');
  let entry=entries.get(window);
  if(action==='runtime.prototype.layout'){
   const bounds=fitRuntimeBounds(window.getContentSize(),args?.layout??null);layouts.set(window,args.layout);entry?.scope?.resize();return{bounds};
  }
  if(action==='runtime.prototype.hide'){if(entry){entry.visible=false;entry.scope?.setVisible(false);}return{visible:false,prototype:true};}
  if(action!=='runtime.prototype.show')throw new Error('Unknown runtime prototype action.');
  if(args?.layout){fitRuntimeBounds(window.getContentSize(),args.layout);layouts.set(window,args.layout);}
  if(!entry){
   entry={visible:true,events:[],cancelled:false};entries.set(window,entry);
   const assertLive=()=>{if(entry.cancelled||window.isDestroyed())throw new Error('The Claude window was closed before the prototype finished opening.');};
   window.once('closed',()=>{entry.cancelled=true;entry.visible=false;entry.scope?.dispose();entries.delete(window);});
   entry.ready=(async()=>{
    assertLive();
    const root=path.join(config.project,'.local','obsidian-claude-prototype','window-'+window.id),vault=path.join(root,'Claude Runtime Demo');
    const installed=config.installed??path.join(process.env.LOCALAPPDATA,'Programs','Obsidian');
    await fsp.access(path.join(installed,'resources','obsidian.asar','main.js'));await fsp.mkdir(root,{recursive:true});
    if(!fs.existsSync(vault))await fsp.cp(config.defaultVault,vault,{recursive:true,errorOnExist:true,force:false});
    assertLive();
    entry.vault=vault;
    await preferences.withCurrent(({controls})=>applyDemoMinimalUi(config.project,vault,{restore:controls==='all'}));
    assertLive();
    const log=(event,extra={})=>{entry.events.push({time:new Date().toISOString(),event,...extra});entry.events=entry.events.slice(-80);fs.writeFileSync(path.join(root,'state.json'),JSON.stringify({prototype:true,pid:process.pid,hostWindowId:window.id,events:entry.events},null,2),'utf8');};
    const require=createRequire(path.join(config.project,'package.json')),factory=require(path.join(config.project,'scripts','prototypes','runtime-scope.cjs'));
    entry.scope=factory({host:window,root,vault,installed,prefix:(config.runtimePrefix??'atelier:claude-runtime-demo:')+window.id+':',log,
     bounds(){return fitRuntimeBounds(window.getContentSize(),layouts.get(window));},
     onShow(view){view.setVisible(entry.visible);},
     onLoaded(view){setTimeout(async()=>{try{if(view.webContents.isDestroyed())return;const state=await view.webContents.executeJavaScript('({ready:!!window.app?.workspace?.layoutReady,file:window.app?.workspace?.getActiveFile()?.path,type:window.app?.workspace?.activeLeaf?.view?.getViewType(),width:innerWidth,height:innerHeight})');log('renderer-state',{state});const image=await Promise.race([view.webContents.capturePage(),new Promise((_,reject)=>setTimeout(()=>reject(new Error('Capture timeout')),8000))]);fs.writeFileSync(path.join(root,'embedded.png'),image.toPNG());log('capture',{bytes:image.toPNG().length});}catch(error){log('capture-error',{message:error.stack});}},2000);}
    });log('scope-created');return root;
   })().catch(error=>{entries.delete(window);throw error;});
  }
  entry.visible=true;await entry.ready;entry.scope.resize();entry.scope.setVisible(entry.visible);return{visible:entry.visible,prototype:true};
 };
}
