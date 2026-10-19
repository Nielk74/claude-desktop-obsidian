import {defaultVault,nodeExecutable,catalogFile} from './defaults.js';
import {noteMarkdown,pages,canvasSvg,baseMarkdown,plain} from './presentation.js';

const PANE='obsidian-vault';
let root=defaultVault,rootDraft=defaultVault,name='Obsidian',files=[],matches=null,query='',kind='all',current=null;
let error='',mode='browse',page=0,viewIndex=0,zoom=1,request=0,searchRequest=0,capture='',capturePath='00 Inbox/Claude response.md',busy=false;
let vaultRevision=0,refreshRequest=0,captureRevision=0;
let vaults=[],activeId=null,catalogLoaded=false,vaultNameDraft='';

async function bridge($,data){
 const result=await $.process.run([nodeExecutable,$.plugin.root+'/bridge/vault.cjs'],{stdin:JSON.stringify({root,catalogFile,catalogDefault:defaultVault,...data}),timeoutMs:30000});
 let response;try{response=JSON.parse(result.stdout);}catch{throw new Error(result.stderr?.trim()||'The vault helper did not return a valid response.');}
 if(!response.ok||result.exitCode!==0)throw new Error(response.message??'The vault operation failed.');
 return response.value;
}
const vault=($,action,args={})=>bridge($,{action,args,vaultId:activeId});
const catalog=($,action,args={},vaultId=activeId)=>bridge($,{action:'catalog.'+action,args,vaultId});
function applyCatalog(data,preserveSelection=false){
 if(data?.version!==1||!Array.isArray(data.vaults))throw new Error('The vault catalog did not return valid settings.');
 const preferred=activeId;vaults=data.vaults;activeId=preserveSelection&&vaults.some(v=>v.id===preferred)?preferred:data.activeId;catalogLoaded=true;
 const selected=vaults.find(v=>v.id===activeId);root=selected?.path??'';name=selected?.name??'Obsidian';
}
async function loadCatalog($){
 const saved=catalogLoaded?undefined:await $.store.get('vaultPath');
 const data=await catalog($,typeof saved==='string'&&saved?'migrate':'list',{path:typeof saved==='string'?saved:undefined});
 if(catalogLoaded&&(data.activeId!==activeId||data.vaults.find(v=>v.id===data.activeId)?.path!==root)){beginSwitch();current=null;files=[];matches=null;query='';mode=data.activeId?'browse':'settings';}
 applyCatalog(data);
}
async function acceptCatalog($,data,revision){
 if(revision!==vaultRevision)return;applyCatalog(data);current=null;files=[];matches=null;query='';kind='all';error='';page=0;mode=activeId?'browse':'settings';rootDraft='';vaultNameDraft='';
 if(activeId&&await refresh($)){
  const selected=vaults.find(v=>v.id===activeId),target=files.find(f=>f.path===selected?.lastNote)?.path??files.find(f=>f.path==='Home.md')?.path;
  if(target)await openFile($,target);
 }redraw($);
}
function beginSwitch(){const revision=++vaultRevision;++request;++searchRequest;++refreshRequest;return revision;}
async function selectVault($,id){const revision=beginSwitch();try{await acceptCatalog($,await catalog($,'activate',{},id),revision);}catch(failure){if(revision===vaultRevision)report($,failure);}}
async function addVault($,value){const revision=beginSwitch();rootDraft=value;try{await acceptCatalog($,await catalog($,'add',{path:value,name:vaultNameDraft||undefined}),revision);}catch(failure){if(revision===vaultRevision)report($,failure);}}
function redraw($){$.ui.invalidate('ui.render');}
function report($,failure){error=plain(failure.message??failure);redraw($);}
async function refresh($){
 if(catalogLoaded&&!activeId){files=[];redraw($);return false;}
 const revision=vaultRevision,id=++refreshRequest;const value=await vault($,'list');
 if(revision!==vaultRevision||id!==refreshRequest)return false;
 name=value.name;files=value.files;if(!query.trim())matches=null;redraw($);return true;
}
async function openFile($,file){
 const id=++request,revision=vaultRevision;error='';
 try{const extension=file.split('.').at(-1);const data=await vault($,extension==='canvas'?'canvas':extension==='base'?'base':'read',{path:file});
  if(id!==request||revision!==vaultRevision)return;current={...data,path:file};mode='browse';page=0;viewIndex=0;zoom=1;redraw($);
  if(activeId)void catalog($,'remember',{path:file}).catch(failure=>{if(id===request&&revision===vaultRevision)report($,failure);});
 }catch(failure){if(id===request&&revision===vaultRevision)report($,failure);}
}
async function toggle($){
 try{
  if((await $.ui.panes()).some(p=>p.id===PANE)){await $.ui.close({id:PANE});return;}
  await $.ui.open({id:PANE,title:'Obsidian',columns:76,rows:28,focus:true});
  await loadCatalog($);if(!activeId){mode='settings';redraw($);return;}
  if(await refresh($))if(!current){const selected=vaults.find(v=>v.id===activeId),target=files.find(f=>f.path===selected?.lastNote)?.path??files.find(f=>f.path==='Home.md')?.path;if(target)await openFile($,target);}
 }catch(failure){mode='settings';report($,failure);}
}
async function captureReply($){
 try{
  await loadCatalog($);if(!activeId){mode='settings';await $.ui.open({id:PANE,title:'Obsidian',columns:76,rows:28,focus:true});redraw($);return;}
  const revision=vaultRevision,navigation=++request,generation=++captureRevision;
  const messages=await $.session.messages();const last=[...messages].reverse().find(m=>m.role==='assistant'&&m.text?.trim());
  if(revision!==vaultRevision||navigation!==request||generation!==captureRevision)return;
  if(!last){$.ui.toast('There is no Claude response to save yet.');return;}
  capture=last.text;mode='capture';page=0;error='';
  await $.ui.open({id:PANE,title:'Obsidian',columns:76,rows:28,focus:true});redraw($);
 }catch(failure){report($,failure);}
}
async function saveCapture($){
 if(busy)return;busy=true;error='';redraw($);
 const revision=vaultRevision,navigation=request,generation=captureRevision;
 try{
  const saved=await vault($,'create',{path:capturePath,content:'# Claude response\n\n'+capture+'\n'});
  if(revision===vaultRevision){
   if(generation===captureRevision){capture='';if(navigation===request&&mode==='capture'){current=saved;mode='browse';page=0;}}
   await refresh($);
  }
  $.ui.toast('Saved to '+saved.path);
 }catch(failure){if(revision===vaultRevision&&generation===captureRevision)report($,failure);}finally{busy=false;redraw($);}
}
async function useNote($){
 try{
  if(!current?.content)return;
  if(current.content.length>20000)throw new Error('This note is too long to insert at once. Copy a shorter passage.');
  const result=await $.prompt.fill({text:'\n\nSource: '+current.path+'\n\n'+current.content.trim()+'\n',mode:'append'});
  if(!result.isFilled)throw new Error('The composer is unavailable. Copy the note and paste it into your draft.');
  $.ui.toast('Note added to your draft.');
 }catch(failure){report($,failure);}
}
async function search($,text){
 const id=++searchRequest,revision=vaultRevision;query=text;error='';
 if(!query.trim()){matches=null;redraw($);return;}
 try{const result=await vault($,'search',{query});if(id!==searchRequest||revision!==vaultRevision)return;matches=result.files;redraw($);}catch(failure){if(id===searchRequest&&revision===vaultRevision)report($,failure);}
}

export function register(on){
 on('session.start',async($,e,next)=>{
  try{await loadCatalog($);}catch(failure){error=plain(failure.message??failure);}
  return next(e);
 });
 on('ui.render',{component:'AbovePrompt'},async($,e,next)=>{
  const {Box,Button}= $.ui.resolve(e);const previous=await next(e);
  return Box({flexDirection:'column',gap:1,children:[previous,Box({flexDirection:'row',columnGap:2,children:[
   Button({key:'obsidian-toggle',label:'◇ Obsidian',onPress:()=>toggle($)}),
   Button({key:'save-last-reply',label:'Save last reply',dimColor:true,onPress:()=>captureReply($)})
  ]})]});
 });
 on('ui.render',{component:'Pane'},async($,e,next)=>{
  if(e.requestId!==PANE)return next(e);
  const {Box,Text,Button,Input,Select,Markdown,Svg}= $.ui.resolve(e);
  const text=value=>Text({children:[plain(value)]});
  const button=(key,label,action)=>Button({key,label,onPress:action});
  const row=children=>Box({flexDirection:'row',flexWrap:'wrap',columnGap:2,children});
  const children=[row([Text({bold:true,color:'#b8a0e6',children:['◇ '+name]}),button('settings','Manage vaults',()=>{mode='settings';rootDraft='';vaultNameDraft='';error='';redraw($);}),button('close','Close',()=>$.ui.close({id:PANE}))]),row([...vaults.map(v=>Button({key:'vault-'+v.id,label:(v.id===activeId?'● ':'')+v.name,dimColor:v.id!==activeId,onPress:()=>selectVault($,v.id)})),button('add-vault','+ Add vault',()=>{mode='settings';rootDraft='';vaultNameDraft='';redraw($);})])];
  if(error)children.push(Text({color:'red',children:[error]}));
  if(mode==='settings'){
   children.push(text('Save multiple vaults, then switch between them using the tabs above.'),Input({key:'vault-name',label:'Name (optional)',value:vaultNameDraft,onInput:value=>{vaultNameDraft=value;},onSubmit:value=>{vaultNameDraft=value;redraw($);}}),Input({key:'vault-path',label:'Vault folder',value:rootDraft,placeholder:'Absolute path to an Obsidian vault',onInput:value=>{rootDraft=value;},onSubmit:value=>addVault($,value)}),row([button('connect-vault','Add vault',()=>addVault($,rootDraft)),button('settings-back','Back to notes',()=>{mode='browse';redraw($);})]),text('Press Enter in the folder field to add it. The main Obsidian tab also offers a folder picker.'));
   for(const v of vaults)children.push(Text({dimColor:true,children:[plain(v.path)]}),Input({key:'rename-vault-'+v.id,label:'Vault name',value:v.name,onSubmit:async value=>{try{applyCatalog(await catalog($,'rename',{name:value},v.id),true);redraw($);}catch(failure){report($,failure);}}}),button('remove-vault-'+v.id,'Remove '+v.name+' from list',async()=>{const revision=beginSwitch();try{const data=await catalog($,'remove',{},v.id);if(v.id===activeId)await acceptCatalog($,data,revision);else{applyCatalog(data,true);redraw($);}}catch(failure){if(revision===vaultRevision)report($,failure);}}));
  }else if(mode==='capture'){
   const parts=pages(plain(capture));page=Math.min(page,parts.length-1);
   children.push(text('Save Claude’s last response as a new Markdown note.'),Input({key:'capture-path',label:'Note path',value:capturePath,onInput:value=>{capturePath=value;},onSubmit:value=>{capturePath=value;redraw($);}}),Markdown({text:parts[page]}),row([button('save-capture',busy?'Saving…':'Save to vault',()=>saveCapture($)),button('cancel-capture','Back to notes',()=>{mode='browse';redraw($);})]));
   if(parts.length>1)children.push(row([button('capture-prev','Previous',()=>{page=Math.max(0,page-1);redraw($);}),text(`Page ${page+1} / ${parts.length}`),button('capture-next','Next',()=>{page=Math.min(parts.length-1,page+1);redraw($);})]));
  }else{
   children.push(row(['all','md','canvas','base'].map(value=>button('filter-'+value,({all:'All',md:'Notes',canvas:'Canvas',base:'Bases'}[value]),()=>{kind=value;redraw($);}))),Input({key:'search',label:'Search vault',value:query,placeholder:'Search note names and content',onInput:value=>{query=value;},onSubmit:value=>search($,value)}));
   const visible=(matches??files).filter(f=>kind==='all'||f.kind===kind);
   if(visible.length)children.push(Select({key:'files',label:`${visible.length} files`,options:visible.slice(0,100).map(f=>({value:f.path,label:f.path})),...(visible.some(f=>f.path===current?.path)?{value:current.path}:{}),onSelect:value=>openFile($,value)}));
   else children.push(text(files.length?'No matching files.':'Open your vault to load its files.'));
   if(visible.length>100)children.push(text('Showing the first 100 files. Search to find another note.'));
   children.push(row([button('refresh','Refresh',async()=>{try{await refresh($);if(query.trim())await search($,query);}catch(failure){report($,failure);}}),button('capture-reply','Save last reply',()=>captureReply($))]));
   if(current){
    children.push(Text({dimColor:true,children:[plain(current.path)]}));
    if(current.kind==='canvas'){
     try{if(Svg)children.push(Svg({source:canvasSvg(current,zoom),alt:'Canvas: '+current.path,width:Math.min(900,e.props.bodyColumns*8),height:380}));else children.push(text('Canvas visual preview is available in Desktop.'));}catch(failure){children.push(text(failure.message));}
     children.push(row([button('zoom-out','−',()=>{zoom=Math.max(1,zoom/1.5);redraw($);}),button('zoom-fit','Fit',()=>{zoom=1;redraw($);}),button('zoom-in','+',()=>{zoom=Math.min(8,zoom*1.5);redraw($);})]));
     const cards=current.nodes.filter(n=>n.type==='file');
     for(const [i,n]of cards.slice(0,60).entries())children.push(button('canvas-file-'+i,n.file,()=>openFile($,n.file)));
    }else{
     let content;
     if(current.kind==='base'){
      if(!current.views.length){children.push(text('This Bases file has no views.'));content='';}
      else{children.push(row(current.views.map((view,i)=>button('base-view-'+i,view.name,()=>{viewIndex=i;page=0;redraw($);}))));content=baseMarkdown(current.views[Math.min(viewIndex,current.views.length-1)]);}
     }else content=noteMarkdown(current.content??'This attachment can be opened in Obsidian.',current.path,files);
     const parts=pages(content);page=Math.min(page,parts.length-1);
     children.push(Markdown({key:'note-body',text:parts[page],pressableLinks:[...new Set([...parts[page].matchAll(/\]\((https:\/\/atelier\.invalid\/note\?i=\d+)\)/g)].map(m=>m[1]))].slice(0,256),onLinkPress:link=>{
      const index=/^https:\/\/atelier\.invalid\/note\?i=(\d+)$/.exec(link.href)?.[1];if(index!==undefined&&files[Number(index)])void openFile($,files[Number(index)].path);
     }}));
     if(parts.length>1)children.push(row([button('page-prev','Previous',()=>{page=Math.max(0,page-1);redraw($);}),text(`Page ${page+1} / ${parts.length}`),button('page-next','Next',()=>{page=Math.min(parts.length-1,page+1);redraw($);})]));
     if(current.kind==='md')children.push(row([button('use-note','Use note in prompt',()=>useNote($)),button('copy-note','Copy note',async()=>{await $.ui.copy(current.content);$.ui.toast('Note copied.');})]));
    }
   }
  }
  return Box({flexDirection:'column',gap:1,children});
 });
}
