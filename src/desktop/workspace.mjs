import {marked} from 'marked';
import DOMPurify from 'dompurify';
import {baseMarkdown} from '../../mods/obsidian/hooks/presentation.js';
import {renderNote,imageSource} from './media.mjs';
import {mountCanvas} from './canvas-view.mjs';
import {createWorkspaceState} from './workspace-state.mjs';
import css from './workspace.css';

const el=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;};

export function mountWorkspace(host,request,{setLayout,onClose,storage}){
 const shadow=host.attachShadow({mode:'open'}),style=el('style');style.textContent=css;shadow.append(style);
 const app=el('section','workspace');app.setAttribute('aria-label','Obsidian vault workspace');shadow.append(app);
 const preferences=createWorkspaceState(storage),frame=fn=>typeof requestAnimationFrame==='function'?requestAnimationFrame(fn):setTimeout(fn,0);let mountedDocument;
 const s={catalog:{vaults:[],activeId:null},files:[],matches:null,current:null,currentVaultId:null,draft:'',dirty:false,editing:false,newFile:false,mode:'notes',query:'',filter:'all',page:0,base:0,generation:0,searchGeneration:0,editRevision:0,loading:false,saving:false,switching:false,message:'',error:false,addPath:'',addName:'',layout:'full'};
 const active=()=>s.catalog.vaults.find(v=>v.id===s.catalog.activeId);
 const call=(action,args={},vaultId=s.catalog.activeId)=>request({action,args,vaultId});
 function rememberView(){const view=mountedDocument;if(preferences.visible&&view&&!view.restoring&&!view.suspended)preferences.rememberDocument(view.vaultId,view.path,{scrollTop:view.content.scrollTop??0});}
 function hide(){rememberView();if(mountedDocument)mountedDocument.suspended=true;preferences.setVisible(false);preferences.flush();}
 function closeWorkspace(){hide();onClose();}
 function trackDocument(content,current){
  const vaultId=s.currentVaultId,path=current.path,saved=preferences.document(vaultId,path),view={vaultId,path,content,restoring:true,suspended:!preferences.visible,controller:null};mountedDocument=view;
  view.restore=()=>{if(mountedDocument!==view||!view.restoring||view.suspended||!preferences.visible)return;content.scrollTop=saved.scrollTop;};
  const interact=()=>{view.restoring=false;};content.onwheel=interact;content.onpointerdown=interact;content.ontouchstart=interact;content.onkeydown=interact;
  content.onscroll=()=>{if(mountedDocument===view&&!view.restoring&&!view.suspended&&preferences.visible)preferences.rememberDocument(vaultId,path,{scrollTop:content.scrollTop});};
  view.ready=()=>frame(()=>{if(mountedDocument!==view||view.suspended||!preferences.visible)return;view.restore();view.restoring=false;});
  frame(view.restore);return {view,saved};
 }
 async function populateImages(markdown,embeds,view){
  const reads=new Map();
  for(const [index,embed]of embeds.entries()){
   if(mountedDocument!==view)return;
   const placeholder=markdown.querySelector(`[data-vault-image="${index}"]`);if(!placeholder)continue;
   try{
    if(!reads.has(embed.path))reads.set(embed.path,call('vault.read',{path:embed.path},view.vaultId));
    const data=await reads.get(embed.path);if(mountedDocument!==view)return;
    const source=imageSource(data);if(!source)throw new Error('Unsupported image format.');
    const image=el('img','embedded-image');image.alt=embed.label;image.decoding='async';if(embed.width)image.width=embed.width;if(embed.height)image.height=embed.height;
    await new Promise(resolve=>{image.onload=resolve;image.onerror=()=>{placeholder.textContent='Image could not be displayed: '+embed.label;resolve();};image.src=source;placeholder.replaceChildren(image);if(image.complete)resolve();});
    view.restore();
   }catch(error){if(mountedDocument===view)placeholder.textContent='Image unavailable: '+embed.label+' · '+error.message;}
  }
  view.ready();
 }
 const message=(text,error=false)=>{s.message=text;s.error=error;renderNotice();};
 const canLeave=()=>{if(!s.dirty)return true;message('Save your changes or discard the draft before switching notes or vaults.',true);return false;};
 function button(label,fn,cls='quiet'){const b=el('button',cls,label);b.type='button';b.onclick=fn;return b;}
 function field(label,value,placeholder,change){const wrap=el('label','field'),input=el('input');wrap.append(el('span','field-label',label));input.value=value;input.placeholder=placeholder;input.oninput=()=>change(input.value);wrap.append(input);return {wrap,input};}
 function renderNotice(){const old=app.querySelector('.notice');old?.remove();if(s.message){const n=el('div','notice'+(s.error?' error':''),s.message);n.setAttribute('role',s.error?'alert':'status');app.querySelector('.workspace-header')?.after(n);}}
 function mergeCatalog(catalog){const preferred=s.current?s.currentVaultId:s.catalog.activeId;s.catalog={...catalog,activeId:catalog.vaults.some(v=>v.id===preferred)?preferred:catalog.activeId};}
 function keepNewDraft(revision,catalog){
  if(revision===s.editRevision&&!s.dirty)return false;
  if(catalog)mergeCatalog(catalog);else if(s.currentVaultId&&s.catalog.vaults.some(v=>v.id===s.currentVaultId))s.catalog.activeId=s.currentVaultId;
  message('Your newer draft is still open. Save or discard it before switching.',true);render();return true;
 }
 async function loadCatalog(){const revision=s.editRevision,catalog=await call('catalog.list');if(revision!==s.editRevision||s.dirty)mergeCatalog(catalog);else s.catalog=catalog;}
 async function listAndOpen(generation=s.generation){
  const selected=active(),revision=s.editRevision;if(!selected){s.files=[];s.current=null;render();return;}
  s.loading=true;render();
  try{
   const result=await call('vault.list',{},selected.id);if(generation!==s.generation||keepNewDraft(revision))return;s.files=result.files;s.matches=null;
   const target=s.files.find(f=>f.path===selected.lastNote)?.path??s.files.find(f=>f.path==='Home.md')?.path??s.files[0]?.path;
   if(target)await openFile(target);else{s.current=null;render();}
  }catch(error){if(generation===s.generation)message(error.message,true);}finally{if(generation===s.generation){s.loading=false;render();}}
 }
 async function selectVault(id){
  if(s.switching||!canLeave())return;const generation=++s.generation,revision=s.editRevision;s.switching=true;message('Opening vault…');
  try{
   const catalog=await call('catalog.activate',{},id);if(generation!==s.generation||keepNewDraft(revision,catalog))return;
   s.catalog=catalog;s.current=null;s.files=[];s.query='';s.matches=null;s.mode='notes';s.dirty=false;s.editing=false;s.message='';
   await listAndOpen(generation);
  }catch(error){if(generation===s.generation)message(error.message,true);}finally{s.switching=false;render();}
 }
 async function openFile(file){
  if(!canLeave())return;const generation=++s.generation,vaultId=s.catalog.activeId,revision=s.editRevision;s.loading=true;message('Opening '+file+'…');
  try{
   const ext=file.split('.').at(-1).toLowerCase(),data=await call(ext==='canvas'?'vault.canvas':ext==='base'?'vault.base':'vault.read',{path:file},vaultId);
   if(generation!==s.generation||vaultId!==s.catalog.activeId||keepNewDraft(revision))return;
   s.current={...data,path:file};s.currentVaultId=vaultId;s.draft=data.content??'';s.editing=false;s.dirty=false;s.newFile=false;s.page=0;s.base=preferences.document(vaultId,file).base;s.message='';
   const selected=active();if(selected)selected.lastNote=file;
   void call('catalog.remember',{path:file},vaultId).catch(error=>{if(generation===s.generation)message(error.message,true);});
  }catch(error){if(generation===s.generation)message(error.message,true);}finally{if(generation===s.generation){s.loading=false;render();}}
 }
 async function save(){
  if(s.saving||!s.current||!s.dirty)return;
  const generation=s.generation,revision=s.editRevision,vaultId=s.currentVaultId,file=s.current.path,content=s.draft,creating=s.newFile;s.saving=true;message('Saving…');
  try{
   const saved=await call(creating?'vault.create':'vault.save',{path:file,content,version:s.current.version},vaultId);
   if(generation!==s.generation||vaultId!==s.currentVaultId)return;
   s.current=saved;s.newFile=false;if(revision===s.editRevision)s.dirty=false;
   if(creating){const list=await call('vault.list',{},vaultId);if(generation===s.generation)s.files=list.files;}
   if(generation===s.generation)message(s.dirty?'Saved the previous version; your newer changes are still in the editor.':'Saved to your vault.');
  }catch(error){if(generation===s.generation)message(error.message,true);}finally{s.saving=false;render();}
 }
 async function search(){
  const query=s.query.trim(),generation=++s.searchGeneration,vaultId=s.catalog.activeId;
  if(!query){s.matches=null;renderFiles();return;}
  try{const result=await call('vault.search',{query},vaultId);if(generation!==s.searchGeneration||vaultId!==s.catalog.activeId||query!==s.query.trim())return;s.matches=result.files;renderFiles();}catch(error){if(generation===s.searchGeneration&&vaultId===s.catalog.activeId)message(error.message,true);}
 }
 async function acceptCatalog(catalog){if(!catalog)return;s.catalog=catalog;s.mode='notes';s.current=null;s.files=[];s.dirty=false;s.editing=false;s.query='';s.addPath='';s.addName='';s.message='';await listAndOpen(++s.generation);}
 async function addVault(pick=false){
  if(!canLeave())return;
  const revision=s.editRevision,generation=s.generation;
  try{const catalog=await call(pick?'catalog.pick':'catalog.add',{path:s.addPath,name:s.addName||undefined});if(!catalog)return;if(generation!==s.generation){mergeCatalog(catalog);render();message('Vault added. Choose its tab when you are ready.');return;}if(keepNewDraft(revision,catalog))return;await acceptCatalog(catalog);}catch(error){message(error.message,true);}
 }
 function renderManage(body){
  const intro=el('div','setup-intro');intro.append(el('span','eyebrow','YOUR VAULTS'),el('h2','',s.catalog.vaults.length?'Make room for every part of your life.':'Bring your notes into Claude.'),el('p','muted','Connect local Obsidian folders once, then switch between them with a tab. Your files stay where they are.'));body.append(intro);
  const form=el('form','add-vault');form.onsubmit=e=>{e.preventDefault();void addVault();};
  const folder=field('Vault folder',s.addPath,'C:\\Users\\…\\My Vault',v=>s.addPath=v),name=field('Name · optional',s.addName,'Personal, Work, Research…',v=>s.addName=v);folder.input.required=true;
  form.append(folder.wrap,button('Browse folders…',()=>addVault(true)),name.wrap);const submit=el('button','primary','Add vault');submit.type='submit';form.append(submit);body.append(form);
  const list=el('div','vault-management');for(const vault of s.catalog.vaults){const row=el('div','vault-card'),name=el('input');name.value=vault.name;name.setAttribute('aria-label','Name for '+vault.name);row.append(name,el('small','path',vault.path));const actions=el('div','row');actions.append(button('Rename',async()=>{try{mergeCatalog(await call('catalog.rename',{name:name.value},vault.id));render();}catch(error){message(error.message,true);}}),button('Open',()=>selectVault(vault.id)),button('Remove from list',async()=>{if(vault.id===s.catalog.activeId&&!canLeave())return;try{const current=s.catalog.activeId,revision=s.editRevision,generation=s.generation,catalog=await call('catalog.remove',{},vault.id);if(current===vault.id&&generation===s.generation&&!keepNewDraft(revision,catalog))await acceptCatalog(catalog);else{mergeCatalog(catalog);render();}}catch(error){message(error.message,true);}},'quiet danger'));row.append(actions);list.append(row);}body.append(list);
 }
 function renderFiles(){
  const tree=app.querySelector('.file-tree');if(!tree)return;tree.replaceChildren();
  const files=(s.matches??s.files).filter(f=>s.filter==='all'||f.kind===s.filter);
  if(!files.length){tree.append(el('p','empty',s.loading?'Loading your vault…':'No matching files.'));return;}
  const add=(parent,file)=>{const b=button(file.name.replace(/\.(md|canvas|base)$/,''),()=>openFile(file.path),'file'+(file.path===s.current?.path?' selected':''));b.title=file.path;b.setAttribute('aria-current',file.path===s.current?.path?'page':'false');b.prepend(el('span','file-symbol',file.kind==='canvas'?'▦':file.kind==='base'?'▤':'·'));parent.append(b);};
  const folders=new Map();for(const file of files){if(s.matches){const row=el('div','search-result');add(row,file);row.append(el('small','muted',file.folder||'Vault root'));tree.append(row);continue;}if(!file.folder){add(tree,file);continue;}let parent=tree,prefix='';for(const part of file.folder.split('/')){prefix+=(prefix?'/':'')+part;let details=folders.get(prefix);if(!details){details=el('details','folder');details.open=s.current?.path.startsWith(prefix+'/')||prefix.split('/').length===1;details.append(el('summary','',part));parent.append(details);folders.set(prefix,details);}parent=details;}add(parent,file);}
 }
 function renderDocument(parent){
  const current=s.current;if(!current){const empty=el('div','document-empty');empty.append(el('span','gem','◇'),el('h2','',s.loading?'Opening your notes…':'Your vault, within reach.'),el('p','muted','Select a note, Canvas, or Base from the file list.'));parent.append(empty);return;}
  const toolbar=el('div','document-toolbar'),title=el('div','document-title');title.append(el('small','eyebrow',active()?.name??'OBSIDIAN'),el('strong','',current.path));toolbar.append(title);const actions=el('div','row');
  if(current.kind==='md'){
   actions.append(button(s.editing?'Read':'Edit',()=>{s.editing=!s.editing;render();}),button('Copy note',async()=>{try{await navigator.clipboard.writeText(s.editing?s.draft:current.content);message('Note copied.');}catch{message('Select and copy the note text with Ctrl+C.');}}));
   if(s.editing){const b=button(s.saving?'Saving…':'Save changes',save,'primary');b.disabled=!s.dirty||s.saving;actions.append(b);}
  }
  toolbar.append(actions);parent.append(toolbar);
  if(s.dirty){const warning=el('div','draft-bar');warning.append(el('span','','Unsaved changes'),button('Discard draft',()=>{s.draft=s.current.content??'';s.dirty=false;s.newFile=false;message('Draft discarded.');render();}));parent.append(warning);}
  const content=el('article','document-content');parent.append(content);
  if(s.editing){const editor=el('textarea','editor');editor.setAttribute('aria-label','Edit '+current.path);editor.value=s.draft;editor.spellcheck=false;editor.oninput=()=>{s.draft=editor.value;s.dirty=true;s.editRevision++;const saveButton=actions.querySelector('.primary');if(saveButton)saveButton.disabled=s.saving;let status=parent.querySelector('.draft-bar');if(!status){status=el('div','draft-bar','Unsaved changes · Save before switching notes.');toolbar.after(status);}};content.append(editor);return;}
  const {view,saved}=trackDocument(content,current);
  if(current.kind==='canvas'){
   content.classList.add('canvas-document');const visual=el('div','canvas-visual');content.append(visual);view.controller=mountCanvas(visual,current,{initial:saved.canvas,onChange:canvas=>preferences.rememberDocument(view.vaultId,view.path,{canvas}),openFile});const links=el('div','canvas-links');for(const node of current.nodes.filter(n=>n.type==='file'))links.append(button(node.file,()=>openFile(node.file)));content.append(links);view.ready();return;
  }
  if(current.dataUrl||current.kind==='svg'){const image=el('img','attachment');image.alt=current.path;image.onload=()=>view.ready();image.onerror=()=>{message('This image could not be displayed.',true);view.ready();};image.src=imageSource(current);content.append(image);if(image.complete)view.ready();return;}
  let rendered;if(current.kind==='base'){const views=el('div','row');current.views.forEach((base,index)=>views.append(button(base.name,()=>{rememberView();view.suspended=true;s.base=index;preferences.rememberDocument(view.vaultId,view.path,{base:index,scrollTop:0});render();},index===s.base?'chip selected':'chip')));content.append(views);rendered={html:marked.parse(current.views.length?baseMarkdown(current.views[Math.min(s.base,current.views.length-1)]):'This Bases file has no views.'),embeds:[]};}else rendered=renderNote(current.content??'',current.path,s.files);
  const markdown=el('div','markdown');markdown.innerHTML=DOMPurify.sanitize(rendered.html,{FORBID_TAGS:['style','iframe','object','embed','form','img'],FORBID_ATTR:['style','src','srcset','autofocus']});
  markdown.onclick=event=>{const link=event.target.closest('a');if(!link)return;const match=/^https:\/\/atelier\.invalid\/note\?i=(\d+)$/.exec(link.href);if(match){event.preventDefault();const file=s.files[Number(match[1])];if(file)void openFile(file.path);}else{link.target='_blank';link.rel='noopener noreferrer';}};content.append(markdown);
  if(rendered.embeds.length)void populateImages(markdown,rendered.embeds,view);else view.ready();
 }
 function render(){
  rememberView();mountedDocument?.controller?.dispose();mountedDocument=null;
  app.replaceChildren();const header=el('header','workspace-header'),brand=el('div','brand');brand.append(el('span','gem','◇'),el('span','','Obsidian'));const controls=el('div','row');controls.append(button(s.layout==='dock'?'Expand':'Beside chat',()=>{s.layout=s.layout==='dock'?'full':'dock';preferences.setLayout(s.layout);setLayout(s.layout);render();}),button('Close',closeWorkspace));header.append(brand,controls);app.append(header);renderNotice();
  const tabs=el('div','vault-tabs');tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Saved vaults');for(const vault of s.catalog.vaults){const b=button(vault.name,()=>selectVault(vault.id),'vault-tab'+(vault.id===s.catalog.activeId&&s.mode==='notes'?' active':''));b.setAttribute('role','tab');b.setAttribute('aria-selected',String(vault.id===s.catalog.activeId&&s.mode==='notes'));b.title=vault.path;b.disabled=s.switching;tabs.append(b);}tabs.append(button('+ Add vault',()=>{s.mode='manage';s.message='';render();},'vault-tab add-tab'));app.append(tabs);
  const body=el('div','workspace-body');app.append(body);if(s.mode==='manage'||!active()){body.classList.add('managing');if(active())body.append(button('← Back to notes',()=>{s.mode='notes';render();}));renderManage(body);return;}
  const sidebar=el('aside','files-sidebar'),searchBox=el('form','search-box'),searchInput=el('input');searchInput.type='search';searchInput.placeholder='Search this vault…';searchInput.setAttribute('aria-label','Search vault');searchInput.value=s.query;searchInput.oninput=()=>s.query=searchInput.value;searchBox.onsubmit=e=>{e.preventDefault();void search();};searchBox.append(searchInput);sidebar.append(searchBox);
  const filters=el('div','filters');for(const[value,label]of [['all','All'],['md','Notes'],['canvas','Canvas'],['base','Bases']])filters.append(button(label,()=>{s.filter=value;render();},'chip'+(s.filter===value?' selected':'')));sidebar.append(filters,el('nav','file-tree'));
  const footer=el('div','files-footer');footer.append(el('small','muted',s.files.length+' local files'),button('Manage vaults',()=>{s.mode='manage';render();}));sidebar.append(footer);body.append(sidebar);const doc=el('main','document');body.append(doc);renderFiles();renderDocument(doc);
 }
 host.addEventListener('keydown',event=>{if((event.ctrlKey||event.metaKey)&&event.key==='s'){event.preventDefault();void save();}if((event.ctrlKey||event.metaKey)&&event.key==='k'){event.preventDefault();shadow.querySelector('input[type=search]')?.focus();}if(event.key==='Escape')closeWorkspace();});
 if(typeof window!=='undefined')window.addEventListener('pagehide',()=>{rememberView();preferences.flush();});
 return {preferences,hide,async show(layout=preferences.layout){s.layout=layout;preferences.setLayout(layout);preferences.setVisible(true);setLayout(layout);try{if(!s.dirty){await loadCatalog();if(!s.dirty&&(!s.current||s.currentVaultId!==s.catalog.activeId))await listAndOpen(++s.generation);}render();}catch(error){render();message(error.message,true);}shadow.querySelector('.workspace-header button')?.focus();},close:closeWorkspace};
}
