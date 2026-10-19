import { expect, test as kitTest } from 'claude-code/testing';
import {defaultVault} from '../hooks/defaults.js';

function test(name:string,run:any,options:any={}){
 kitTest(name,async($,on)=>{
  let reads=0,state:any={version:1,activeId:'fixture-default',vaults:[{id:'fixture-default',name:'Atelier Demo Vault',path:defaultVault,lastNote:null}]};
  if(options.externalSelectionOnRename)state.vaults.push({id:'fixture-other',name:'Work',path:'C:\\Work',lastNote:null});
  let savedVaultLookup:any;
  on('store.get',($,e,next)=>savedVaultLookup?savedVaultLookup($,e,next):{value:undefined});
  const fixtures=(event:any,handler:any)=>{if(event==='store.get'){savedVaultLookup=handler;return;}return on(event,async($,e,next)=>{
   if(event==='process.run'){
    const r=JSON.parse(e.init.stdin);
    if(r.action.startsWith('catalog.')){
     if(r.action==='catalog.list'&&++reads===2&&options.externalVaultOnSecondRead){state.vaults.push({id:'fixture-external',name:'Research',path:'C:\\Research',lastNote:'Home.md'});state.activeId='fixture-external';}
     if(r.action==='catalog.add'&&options.rejectAdd)return {value:{exitCode:1,stdout:JSON.stringify({ok:false,message:'Choose an existing vault folder.'}),stderr:''}};
     if(r.action==='catalog.add'||r.action==='catalog.migrate'&&r.args.path){let v=state.vaults.find((v:any)=>v.path===r.args.path);if(!v){v={id:'fixture-'+state.vaults.length,name:r.args.name||r.args.path.split(/[\\/]/).at(-1),path:r.args.path,lastNote:null};state.vaults.push(v);}state.activeId=v.id;}
     if(r.action==='catalog.activate')state.activeId=r.vaultId;
     if(r.action==='catalog.rename'){state.vaults.find((v:any)=>v.id===r.vaultId).name=r.args.name;if(options.externalSelectionOnRename)state.activeId='fixture-other';}
     if(r.action==='catalog.remove'){state.vaults=state.vaults.filter((v:any)=>v.id!==r.vaultId);if(state.activeId===r.vaultId)state.activeId=state.vaults[0]?.id??null;}
     if(r.action==='catalog.remember'){const v=state.vaults.find((v:any)=>v.id===r.vaultId);if(v)v.lastNote=r.args.path;}
     return {value:{exitCode:0,stdout:JSON.stringify({ok:true,value:state}),stderr:''}};
    }
   }
   return handler($,e,next);
  });};
  await run($,fixtures);
 });
}

const bandTarget = {
 plugin:'atelier-obsidian',surface:'desktop',component:'AbovePrompt',
 viewport:{columns:160,rows:45,isFullscreen:true},
 props:{hasSurvey:false,isWorking:false,maxRows:5,bodyColumns:90,scroll:{offset:0,bodyRows:5},view:{}}
} as const;
const paneTarget = {
 plugin:'atelier-obsidian',surface:'desktop',component:'Pane',requestId:'obsidian-vault',
 viewport:{columns:160,rows:45,isFullscreen:true},
 props:{title:'Obsidian',isFocused:true,bodyColumns:76,placement:'dock',scroll:{offset:0,bodyRows:36},view:{}}
} as const;

test('visible button opens a native notes pane without submitting a prompt',async ($,on)=>{
 let opened='',submissions=0;
 on('ui.render',()=>({type:'Text',props:{},children:['another mod']}));
 on('ui.panes',()=>({value:[]}));
 on('ui.open',($,e)=>{opened=e.id;return {value:undefined};});
 on('ui.toast',()=>({value:undefined}));
 on('process.run',($,e)=>{
  const request=JSON.parse(e.init.stdin);
  const value=request.action==='list'?{name:'Demo',files:[{path:'Home.md',name:'Home.md',kind:'md',folder:''}]}:{path:'Home.md',kind:'md',content:'# Home\nA real note.',version:'v1',size:20};
  return {value:{exitCode:0,stdout:JSON.stringify({ok:true,value}),stderr:''}};
 });
 on('prompt.submit',()=>{submissions++;return {text:''};});
 const band=await $.ui.mount(bandTarget);
 expect(await band.find({key:'obsidian-toggle',type:'Button'})).toBeDefined();
 expect(await band.find({type:'Text',text:'another mod'})).toBeDefined();
 await band.press({key:'obsidian-toggle'});
 expect(opened).toBe('obsidian-vault');
 const pane=await $.ui.mount(paneTarget);
 expect(await pane.find({type:'Markdown',text:/A real note/})).toBeDefined();
 expect(submissions).toBe(0);
});

test('using a note appends a sourced passage without replacing the draft or submitting it',async ($,on)=>{
 let filled:any=null,submissions=0;
 on('ui.render',()=>({type:'Text',props:{},children:[]}));
 on('ui.panes',()=>({value:[]}));
 on('ui.open',()=>({value:undefined}));
 on('ui.toast',()=>({value:undefined}));
 on('prompt.fill',($,e)=>{filled=e;return {isFilled:true};});
 on('prompt.submit',()=>{submissions++;return {text:''};});
 on('process.run',($,e)=>({value:{exitCode:0,stderr:'',stdout:JSON.stringify({ok:true,value:JSON.parse(e.init.stdin).action==='list'?{name:'Demo',files:[{path:'Home.md',name:'Home.md',kind:'md',folder:''}]}:{path:'Home.md',kind:'md',content:'# Home\nMy note.',version:'v1',size:15}})}}));
 const band=await $.ui.mount(bandTarget);await band.press({key:'obsidian-toggle'});
 const pane=await $.ui.mount(paneTarget);await pane.press({key:'use-note'});
 expect(filled.mode).toBe('append');
 expect(filled.text).toContain('Source: Home.md');
 expect(filled.text).toContain('My note.');
 expect(submissions).toBe(0);
});

test('save last reply requires a visible capture preview and preserves it on conflict',async ($,on)=>{
 let writes=0;
 on('ui.render',()=>({type:'Text',props:{},children:[]}));
 on('ui.open',()=>({value:undefined}));
 on('ui.toast',()=>({value:undefined}));
 on('session.messages',()=>({value:[{role:'assistant',text:'A useful response.',toolUses:[]}]}));
 on('process.run',($,e)=>{
  if(JSON.parse(e.init.stdin).action==='create'){writes++;return {value:{exitCode:1,stdout:JSON.stringify({ok:false,code:'CONFLICT',message:'The note already exists.'}),stderr:''}};}
  return {value:{exitCode:0,stdout:JSON.stringify({ok:true,value:{name:'Demo',files:[]}}),stderr:''}};
 });
 const band=await $.ui.mount(bandTarget);await band.press({key:'save-last-reply'});
 expect(writes).toBe(0);
 const pane=await $.ui.mount(paneTarget);
 expect(await pane.find({type:'Markdown',text:/A useful response/})).toBeDefined();
 await pane.press({key:'save-capture'});
 expect(writes).toBe(1);
 expect(await pane.find({type:'Markdown',text:/A useful response/})).toBeDefined();
 expect(await pane.find({type:'Text',text:/already exists/})).toBeDefined();
});

test('Canvas boards draw native SVG and file buttons open the linked note',async ($,on)=>{
 on('ui.render',()=>({type:'Text',props:{},children:[]}));
 on('ui.panes',()=>({value:[]}));on('ui.open',()=>({value:undefined}));
 on('process.run',($,e)=>{
  const request=JSON.parse(e.init.stdin);let value:any;
  if(request.action==='list')value={name:'Demo',files:[{path:'Board.canvas',name:'Board.canvas',kind:'canvas',folder:''},{path:'Linked.md',name:'Linked.md',kind:'md',folder:''}]};
  else if(request.action==='canvas')value={path:'Board.canvas',kind:'canvas',nodes:[{id:'f',type:'file',file:'Linked.md',x:-100,y:0,width:300,height:180}],edges:[]};
  else value={path:'Linked.md',kind:'md',content:'# Linked\nOpened from the Canvas.',version:'v1',size:35};
  return {value:{exitCode:0,stdout:JSON.stringify({ok:true,value}),stderr:''}};
 });
 const band=await $.ui.mount(bandTarget);await band.press({key:'obsidian-toggle'});
 const pane=await $.ui.mount(paneTarget);await pane.select({key:'files',value:'Board.canvas'});
 expect(await pane.find({type:'Svg'})).toBeDefined();
 await pane.press({key:'canvas-file-0'});
 expect(await pane.find({type:'Markdown',text:/Opened from the Canvas/})).toBeDefined();
});

test('large notes paginate within native Markdown limits without losing the final paragraph',async ($,on)=>{
 const body='A paragraph.\n'.repeat(1800)+'FINAL PARAGRAPH';
 on('ui.render',()=>({type:'Text',props:{},children:[]}));on('ui.panes',()=>({value:[]}));on('ui.open',()=>({value:undefined}));
 on('process.run',($,e)=>({value:{exitCode:0,stderr:'',stdout:JSON.stringify({ok:true,value:JSON.parse(e.init.stdin).action==='list'?{name:'Demo',files:[{path:'Home.md',name:'Home.md',kind:'md',folder:''}]}:{path:'Home.md',kind:'md',content:body,version:'v1',size:body.length}})}}));
 const band=await $.ui.mount(bandTarget);await band.press({key:'obsidian-toggle'});
 const pane=await $.ui.mount(paneTarget);
 expect((await pane.find({type:'Markdown'})).props.text.length<10000).toBe(true);
 await pane.press({key:'page-next'});await pane.press({key:'page-next'});
 expect(await pane.find({type:'Markdown',text:/FINAL PARAGRAPH/})).toBeDefined();
});

test('an old note response cannot appear after switching to a different vault',async ($,on)=>{
 let release:any,started:any;const held=new Promise(resolve=>release=resolve),waiting=new Promise(resolve=>started=resolve);
 on('ui.render',()=>({type:'Text',props:{},children:[]}));on('ui.panes',()=>({value:[]}));on('ui.open',()=>({value:undefined}));on('store.set',()=>({value:undefined}));
 on('process.run',async($,e)=>{
  const r=JSON.parse(e.init.stdin);let value:any;
  if(r.action==='read'){started();await held;value={path:'Old.md',kind:'md',content:'OLD VAULT SECRET',version:'v1',size:16};}
  else value=r.root==='new-vault'?{name:'New vault',files:[{path:'New.md',name:'New.md',kind:'md',folder:''}]}:{name:'Old vault',files:[{path:'Old.md',name:'Old.md',kind:'md',folder:''}]};
  return {value:{exitCode:0,stdout:JSON.stringify({ok:true,value}),stderr:''}};
 });
 const band=await $.ui.mount(bandTarget);await band.press({key:'obsidian-toggle'});
 const pane=await $.ui.mount(paneTarget);const pending=pane.select({key:'files',value:'Old.md'});await waiting;
 await pane.press({key:'settings'});await pane.input({key:'vault-path',text:'new-vault'});
 release();await pending;
 expect(await pane.find({type:'Text',text:'◇ New vault'})).toBeDefined();
 expect(await pane.find({type:'Markdown',text:/OLD VAULT SECRET/})).toBeUndefined();
});

test('finishing an older save preserves newer note navigation',async ($,on)=>{
 let release:any,started:any;const held=new Promise(resolve=>release=resolve),waiting=new Promise(resolve=>started=resolve);
 on('ui.render',()=>({type:'Text',props:{},children:[]}));on('ui.panes',()=>({value:[]}));on('ui.open',()=>({value:undefined}));on('ui.toast',()=>({value:undefined}));
 on('session.messages',()=>({value:[{role:'assistant',text:'CAPTURE',toolUses:[]}]}));
 on('process.run',async($,e)=>{
  const r=JSON.parse(e.init.stdin);let value:any;
  if(r.action==='create'){started();await held;value={path:'Saved.md',kind:'md',content:'CAPTURE',version:'v1',size:7};}
  else if(r.action==='list')value={name:'Demo',files:[{path:'New.md',name:'New.md',kind:'md',folder:''}]};
  else value={path:'New.md',kind:'md',content:'NEWER NOTE',version:'v1',size:10};
  return {value:{exitCode:0,stdout:JSON.stringify({ok:true,value}),stderr:''}};
 });
 const band=await $.ui.mount(bandTarget);await band.press({key:'obsidian-toggle'});await band.press({key:'save-last-reply'});
 const pane=await $.ui.mount(paneTarget);const pending=pane.press({key:'save-capture'});await waiting;
 await pane.press({key:'cancel-capture'});await pane.select({key:'files',value:'New.md'});release();await pending;
 expect(await pane.find({type:'Markdown',text:'NEWER NOTE'})).toBeDefined();
});

test('long Unicode note paths use links that remain valid native Markdown',async ($,on)=>{
 const longPath='中'.repeat(240)+'.md';
 on('ui.render',()=>({type:'Text',props:{},children:[]}));on('ui.panes',()=>({value:[]}));on('ui.open',()=>({value:undefined}));
 on('process.run',($,e)=>({value:{exitCode:0,stderr:'',stdout:JSON.stringify({ok:true,value:JSON.parse(e.init.stdin).action==='list'?{name:'Demo',files:[{path:'Home.md',name:'Home.md',kind:'md',folder:''},{path:longPath,name:longPath,kind:'md',folder:''}]}:{path:'Home.md',kind:'md',content:'[['+longPath+'|Read linked note]]',version:'v1',size:750}})}}));
 const band=await $.ui.mount(bandTarget);await band.press({key:'obsidian-toggle'});
 const pane=await $.ui.mount(paneTarget);
 const body=await pane.find({type:'Markdown',text:/Read linked note/});expect(body).toBeDefined();
 expect(body.props.pressableLinks[0].length<=2048).toBe(true);
});

test('a valid Bases document with no views displays an empty state',async ($,on)=>{
 on('ui.render',()=>({type:'Text',props:{},children:[]}));on('ui.panes',()=>({value:[]}));on('ui.open',()=>({value:undefined}));
 on('process.run',($,e)=>({value:{exitCode:0,stderr:'',stdout:JSON.stringify({ok:true,value:JSON.parse(e.init.stdin).action==='list'?{name:'Demo',files:[{path:'Empty.base',name:'Empty.base',kind:'base',folder:''}]}:{path:'Empty.base',kind:'base',views:[],size:11}})}}));
 const band=await $.ui.mount(bandTarget);await band.press({key:'obsidian-toggle'});
 const pane=await $.ui.mount(paneTarget);await pane.select({key:'files',value:'Empty.base'});
 expect(await pane.find({type:'Text',text:/no views/})).toBeDefined();
});

test('search submits its query to the vault helper',async ($,on)=>{
 let searched=false;
 on('ui.render',()=>({type:'Text',props:{},children:[]}));on('ui.panes',()=>({value:[]}));on('ui.open',()=>({value:undefined}));on('store.set',()=>({value:undefined}));
 on('process.run',async($,e)=>{
  const r=JSON.parse(e.init.stdin);
  if(r.action==='search')searched=true;
  const value=r.root==='new-vault'?{name:'New vault',files:[{path:'New.md',name:'New.md',kind:'md',folder:''}]}:{name:'Old vault',files:[{path:'Private.md',name:'Private.md',kind:'md',folder:''}]};
  return {value:{exitCode:0,stdout:JSON.stringify({ok:true,value}),stderr:''}};
 });
 const band=await $.ui.mount(bandTarget);await band.press({key:'obsidian-toggle'});const pane=await $.ui.mount(paneTarget);
 await pane.input({key:'search',text:'private'});
 expect(searched).toBe(true);
});

test('finishing a previous save does not erase a newer response capture',async ($,on)=>{
 let release:any,started:any,response='FIRST CAPTURE';const held=new Promise(resolve=>release=resolve),waiting=new Promise(resolve=>started=resolve);
 on('ui.render',()=>({type:'Text',props:{},children:[]}));on('ui.open',()=>({value:undefined}));on('ui.toast',()=>({value:undefined}));
 on('session.messages',()=>({value:[{role:'assistant',text:response,toolUses:[]}]}));
 on('process.run',async($,e)=>{
  const r=JSON.parse(e.init.stdin);if(r.action==='create'){started();await held;return {value:{exitCode:0,stderr:'',stdout:JSON.stringify({ok:true,value:{path:'Saved.md',kind:'md',content:'FIRST CAPTURE',size:13}})}};}
  return {value:{exitCode:0,stderr:'',stdout:JSON.stringify({ok:true,value:{name:'Demo',files:[]}})}};
 });
 const band=await $.ui.mount(bandTarget);await band.press({key:'save-last-reply'});const pane=await $.ui.mount(paneTarget);
 const pending=pane.press({key:'save-capture'});await waiting;response='NEW CAPTURE';await band.press({key:'save-last-reply'});release();await pending;
 expect(await pane.find({type:'Markdown',text:'NEW CAPTURE'})).toBeDefined();
});

test('saved vaults appear as tabs and a named addition keeps both vaults accessible',async($,on)=>{
 on('ui.render',()=>({type:'Text',props:{},children:[]}));on('ui.panes',()=>({value:[]}));on('ui.open',()=>({value:undefined}));on('store.get',()=>({value:undefined}));
 on('process.run',($,e)=>{const r=JSON.parse(e.init.stdin);return {value:{exitCode:0,stderr:'',stdout:JSON.stringify({ok:true,value:r.action==='list'?{name:r.root===defaultVault?'Demo':'Work',files:[{path:'Home.md',kind:'md',name:'Home.md',folder:''}]}:{path:'Home.md',kind:'md',content:r.root===defaultVault?'PERSONAL NOTE':'WORK NOTE',version:'v1',size:10}})}};});
 const band=await $.ui.mount(bandTarget);await band.press({key:'obsidian-toggle'});const pane=await $.ui.mount(paneTarget);
 expect(await pane.find({key:'vault-fixture-default'})).toBeDefined();
 await pane.press({key:'settings'});await pane.input({key:'vault-name',text:'Work'});await pane.input({key:'vault-path',text:'C:\\Work'});
 expect(await pane.find({key:'vault-fixture-1',type:'Button'})).toBeDefined();expect(await pane.find({type:'Markdown',text:'WORK NOTE'})).toBeDefined();
 await pane.press({key:'vault-fixture-default'});expect(await pane.find({type:'Markdown',text:'PERSONAL NOTE'})).toBeDefined();
});

test('a failed vault addition preserves the current registered vault and its note',async($,on)=>{
 on('ui.render',()=>({type:'Text',props:{},children:[]}));on('ui.panes',()=>({value:[]}));on('ui.open',()=>({value:undefined}));on('store.get',()=>({value:undefined}));
 on('process.run',($,e)=>({value:{exitCode:0,stderr:'',stdout:JSON.stringify({ok:true,value:JSON.parse(e.init.stdin).action==='list'?{name:'Demo',files:[{path:'Home.md',kind:'md',name:'Home.md',folder:''}]}:{path:'Home.md',kind:'md',content:'KEEP THIS NOTE',version:'v1',size:14}})}}));
 const band=await $.ui.mount(bandTarget);await band.press({key:'obsidian-toggle'});const pane=await $.ui.mount(paneTarget);await pane.press({key:'settings'});await pane.input({key:'vault-path',text:'C:\\Missing'});
 expect(await pane.find({type:'Text',text:/existing vault/})).toBeDefined();await pane.press({key:'settings-back'});expect(await pane.find({type:'Markdown',text:'KEEP THIS NOTE'})).toBeDefined();
},{rejectAdd:true});

test('the previous single-vault setting migrates into the shared saved-vault list',async($,on)=>{
 let root='';on('ui.render',()=>({type:'Text',props:{},children:[]}));on('ui.panes',()=>({value:[]}));on('ui.open',()=>({value:undefined}));on('store.get',($,e)=>({value:e.key==='vaultPath'?'C:\\Legacy notes':undefined}));
 on('process.run',($,e)=>{const r=JSON.parse(e.init.stdin);root=r.root;return {value:{exitCode:0,stderr:'',stdout:JSON.stringify({ok:true,value:{name:'Legacy notes',files:[]}})}};});
 const band=await $.ui.mount(bandTarget);await band.press({key:'obsidian-toggle'});const pane=await $.ui.mount(paneTarget);expect(root).toBe('C:\\Legacy notes');expect(await pane.find({key:'vault-fixture-1'})).toBeDefined();
});

test('reopening the pane refreshes vaults configured in the main Desktop tab',async($,on)=>{
 on('ui.render',()=>({type:'Text',props:{},children:[]}));on('ui.panes',()=>({value:[]}));on('ui.open',()=>({value:undefined}));
 on('process.run',($,e)=>{const r=JSON.parse(e.init.stdin);return {value:{exitCode:0,stderr:'',stdout:JSON.stringify({ok:true,value:r.action==='list'?{name:r.root===defaultVault?'Demo':'Research',files:[{path:'Home.md',kind:'md',name:'Home.md',folder:''}]}:{path:'Home.md',kind:'md',content:r.root===defaultVault?'DEMO NOTE':'EXTERNAL VAULT NOTE',version:'v1',size:10}})}};});
 const band=await $.ui.mount(bandTarget);await band.press({key:'obsidian-toggle'});const pane=await $.ui.mount(paneTarget);await band.press({key:'obsidian-toggle'});
 expect(await pane.find({key:'vault-fixture-external'})).toBeDefined();expect(await pane.find({type:'Markdown',text:'EXTERNAL VAULT NOTE'})).toBeDefined();
},{externalVaultOnSecondRead:true});

test('renaming a vault preserves the pane selection when another surface changes the global selection',async($,on)=>{
 let listedRoot='';on('ui.render',()=>({type:'Text',props:{},children:[]}));on('ui.panes',()=>({value:[]}));on('ui.open',()=>({value:undefined}));
 on('process.run',($,e)=>{const r=JSON.parse(e.init.stdin);if(r.action==='list')listedRoot=r.root;return {value:{exitCode:0,stderr:'',stdout:JSON.stringify({ok:true,value:r.action==='list'?{name:'Personal',files:[{path:'Home.md',kind:'md',name:'Home.md',folder:''}]}:{path:'Home.md',kind:'md',content:'PERSONAL NOTE',version:'v1',size:10}})}};});
 const band=await $.ui.mount(bandTarget);await band.press({key:'obsidian-toggle'});const pane=await $.ui.mount(paneTarget);await pane.press({key:'settings'});await pane.input({key:'rename-vault-fixture-default',text:'Renamed'});await pane.press({key:'settings-back'});await pane.press({key:'refresh'});expect(listedRoot).toBe(defaultVault);
},{externalSelectionOnRename:true});
