import {App} from '@modelcontextprotocol/ext-apps';
import {Marked} from 'marked';
import DOMPurify from 'dompurify';
import {parse as parseYaml} from 'yaml';
import {resolveNoteLink,canvasLayout,sourceExcerpt,prepareMarkdown} from './render.mjs';
import {saveCompletion,serializeActions} from './editor-state.mjs';

const $=id=>document.getElementById(id);
const state={files:[],current:null,filter:'all',dirty:false,mode:'read',context:[],selection:'',request:0,searchRequest:0};
const contextAction=serializeActions();
const previewToken=document.querySelector('meta[name="preview-token"]')?.content;
let app,toastTimer;
const clean=s=>DOMPurify.sanitize(s,{FORBID_TAGS:['style','iframe','object','embed','form'],FORBID_ATTR:['style','src','srcset','autofocus','formaction']});
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon=kind=>({md:'#',canvas:'◇',base:'▤',svg:'▧',png:'▧',txt:'≡'}[kind]??'▧');
const trimFrontmatter=s=>s.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/,'');
const message=(text,error=false)=>{$('toast').textContent=text;$('toast').classList.toggle('error',error);$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,5500);};
function element(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e;}
async function call(name,args={}) {
 let result;
 if(previewToken) {
  const response=await fetch('/api/'+name,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+previewToken},body:JSON.stringify(args)});
  result=await response.json();if(!response.ok)throw Object.assign(new Error(result.message),{code:result.code});
  return result;
 }
 result=await app.callServerTool({name,arguments:args});
 const data=result.structuredContent??JSON.parse(result.content?.find(c=>c.type==='text')?.text??'{}');
 if(result.isError)throw Object.assign(new Error(data.message??'The vault operation failed.'),{code:data.code});
 return data;
}
const md=new Marked({breaks:false,gfm:true,extensions:[{
 name:'wikilink',level:'inline',start:src=>src.indexOf('[['),
 tokenizer(src){const m=/^(!?)\[\[([^\]\n]+)\]\]/.exec(src);if(m)return {type:'wikilink',raw:m[0],target:m[2],embed:!!m[1]};},
 renderer(token){const r=resolveNoteLink(token.target,state.current?.path??'Home.md',state.files);return token.embed?`<div class="embed-block" data-embed="${escape(token.target)}">${escape(r.label)}</div>`:`<a href="#" data-note="${escape(r.path)}" data-anchor="${escape(r.anchor)}" class="${r.missing?'missing-link':''}">${escape(r.label)}</a>`;}
}],renderer:{image(token){return `<span class="embed-block" data-embed="${escape(token.href)}">${escape(token.text)}</span>`;}}});
function markdown(raw){return clean(md.parse(prepareMarkdown(trimFrontmatter(raw)).replace(/^>\s*\[!([^\]]+)\]\s*(.*)$/gm,(_,type,title)=>'> **'+(title||type.replace(/^./,s=>s.toUpperCase()))+'**')));}
function rememberSelection() {
 if(state.mode==='edit') {const e=$('editor');state.selection=e.value.slice(e.selectionStart,e.selectionEnd);}
 else {const s=window.getSelection();if(s?.rangeCount&&$('reader').contains(s.getRangeAt(0).commonAncestorContainer))state.selection=s.toString();}
 $('use-passage').firstChild.textContent=state.selection?'Use selection in chat ':'Use note in chat ';
}
function setDirty(value) {
 state.dirty=value;$('save').disabled=!value||!!state.saving;$('draft-warning').hidden=!value;
 $('draft-message').textContent='Your draft has unsaved changes.';
 $('document-status').textContent=value?'Unsaved changes':state.current?'Local file · '+state.current.size.toLocaleString()+' bytes':'Your notes, alongside your conversation.';
}
function canNavigate(){if(!state.dirty)return true;message('Save your changes or reload the current note before navigating.',true);return false;}
function fileButton(file) {
 const button=element('button','file-row'+(state.current?.path===file.path?' selected':''));button.title=file.path;
 button.append(element('span','file-icon',icon(file.kind)),element('span','file-name',file.name.replace(/\.(md|canvas|base)$/,'')));
 button.onclick=()=>openFile(file.path);return button;
}
function renderTree(files=state.files,search=false) {
 const nav=$('file-tree');nav.replaceChildren();const filtered=files.filter(f=>state.filter==='all'||f.kind===state.filter);
 if(!filtered.length){nav.append(element('p','empty','No matching files. Try a different search.'));return;}
 if(search) {
  for(const f of filtered){const button=element('button','search-result');button.append(element('strong','',f.name),element('small','',f.folder||'Vault root'),element('small','',f.excerpt??''));button.onclick=()=>openFile(f.path);nav.append(button);}return;
 }
 const tree={folders:new Map(),files:[]};
 for(const file of filtered) {
  const parts=file.path.split('/');parts.pop();let node=tree;
  for(const part of parts){if(!node.folders.has(part))node.folders.set(part,{folders:new Map(),files:[]});node=node.folders.get(part);}
  node.files.push(file);
 }
 function append(node,parent,depth=0) {
  for(const f of node.files)parent.append(fileButton(f));
  for(const [name,folder] of node.folders) {
   const details=element('details','folder');details.open=depth===0&&(name.startsWith('01 ')||state.filter!=='all');
   if(state.current?.path.split('/').includes(name))details.open=true;
   details.append(element('summary','',name));const children=element('div','folder-children');append(folder,children,depth+1);details.append(children);parent.append(details);
  }
 }
 append(tree,nav);
}
async function refresh() {const result=await call('vault_list');state.files=result.files;$('vault-name').textContent=result.name;$('file-count').textContent=state.files.length+' files';if($('search').value.trim())await search();else renderTree();}
async function search() {
 const request=++state.searchRequest;const query=$('search').value.trim();
 if(!query){renderTree();return;}
 try{const result=await call('vault_search',{query});if(request===state.searchRequest)renderTree(result.files,true);}catch(e){if(request===state.searchRequest)message(e.message,true);}
}
function showMode(mode) {
 state.mode=mode;const mdFile=state.current?.kind==='md';
 $('read-mode').hidden=!mdFile;$('edit-mode').hidden=!mdFile;$('save').hidden=!mdFile||mode!=='edit';
 $('read-mode').classList.toggle('active',mode==='read');$('edit-mode').classList.toggle('active',mode==='edit');
 $('reader').hidden=mode!=='read';$('editor').hidden=mode!=='edit';$('canvas-view').hidden=mode!=='canvas';$('base-view').hidden=mode!=='base';
 $('use-passage').hidden=!mdFile;$('copy-passage').hidden=!mdFile;
}
async function openFile(file,anchor='') {
 if(!canNavigate())return;const request=++state.request;
 $('editor').disabled=true;$('edit-mode').disabled=true;
 $('document-status').textContent='Opening '+file+'…';
 try {
  const kind=file.split('.').at(-1).toLowerCase();
  const data=await call(kind==='canvas'?'vault_canvas':kind==='base'?'vault_base':'vault_read',{path:file});
  if(request!==state.request)return;
  state.current={...data,path:file,kind};state.selection='';setDirty(false);
  $('breadcrumb').textContent=file.split('/').join('  /  ');$('document-kind').textContent=({md:'MARKDOWN NOTE',canvas:'CANVAS BOARD',base:'BASES TABLE',svg:'IMAGE ATTACHMENT'}[kind]??'VAULT FILE');
  if(kind==='canvas'){showMode('canvas');renderCanvas(data);}
  else if(kind==='base'){showMode('base');renderBase(data);}
  else {
   showMode('read');$('editor').value=data.content??'';renderReader(data);
   if(anchor)setTimeout(()=>scrollToAnchor(anchor),50);
  }
  $('document-area').scrollTop=0;renderTree();document.body.classList.remove('nav-open');
 } catch(e){if(request===state.request){message(e.message,true);$('document-status').textContent='Could not open file';}}
 finally{if(request===state.request){$('editor').disabled=false;$('edit-mode').disabled=false;}}
}
function renderReader(data) {
 const reader=$('reader');reader.replaceChildren();
 if(data.kind==='svg'||data.dataUrl){const image=element('img','embedded-image');image.alt=data.name??data.path;image.src=data.dataUrl??svgUrl(data.content);reader.append(image);return;}
 if(data.kind==='txt'){reader.append(element('pre','',data.content));return;}
 let properties={};try{properties=parseYaml(data.content.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1]??'',{maxAliasCount:50})??{};}catch{}
 const chips=element('div','properties');
 for(const k of ['type','status','tags'])if(properties[k])chips.append(element('span','property-chip',k==='tags'?[properties[k]].flat().map(t=>'#'+t).join(' '):String(properties[k])));
 const content=element('div','markdown-content');content.innerHTML=markdown(data.content);
 reader.append(chips,content);populateEmbeds(content,state.request);
}
function section(text,anchor) {
 if(!anchor)return trimFrontmatter(text);
 if(anchor.startsWith('^'))return text.split(/\r?\n/).find(l=>l.includes(anchor))??text;
 const lines=trimFrontmatter(text).split(/\r?\n/);const i=lines.findIndex(l=>l.replace(/^#+\s*/,'').trim()===anchor);
 if(i<0)return trimFrontmatter(text);const level=lines[i].match(/^#+/)?.[0].length??6;
 const end=lines.findIndex((l,j)=>j>i&&new RegExp('^#{1,'+level+'}\\s').test(l));return lines.slice(i,end<0?undefined:end).join('\n');
}
async function populateEmbeds(container,request) {
 for(const placeholder of container.querySelectorAll('[data-embed]')) {
  const reference=resolveNoteLink(placeholder.dataset.embed,state.current.path,state.files);
  if(reference.missing){placeholder.textContent='Attachment or embedded note unavailable: '+reference.label;continue;}
  try{
   const data=await call('vault_read',{path:reference.path});if(request!==state.request)return;
   const wrapper=element('div');
   if(data.dataUrl||data.kind==='svg') {const img=element('img','embedded-image');img.alt=reference.label;img.src=data.dataUrl??svgUrl(data.content);wrapper.append(img);}
   else if(data.kind==='md'){wrapper.innerHTML=markdown(section(data.content,reference.anchor));}
   else {wrapper.append(element('p','',reference.label));}
   const a=element('a','',reference.label+' ↗');a.href='#';a.dataset.note=reference.path;a.dataset.anchor=reference.anchor;wrapper.append(a);placeholder.replaceChildren(wrapper);
  }catch{placeholder.textContent='Preview unavailable: '+reference.label;}
 }
}
function svgUrl(text){const safe=DOMPurify.sanitize(text,{USE_PROFILES:{svg:true,svgFilters:true},FORBID_TAGS:['foreignObject','image','use','a','style'],FORBID_ATTR:['href','xlink:href','src','style']});return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(safe);}
function scrollToAnchor(anchor) {
 const target=[...$('reader').querySelectorAll('h1,h2,h3,h4,h5,h6,p,li')].find(e=>anchor.startsWith('^')?e.textContent.includes(anchor):e.textContent.trim()===anchor);
 target?.scrollIntoView({block:'start'});
}
async function save() {
 if(!state.current||!state.dirty||state.saving)return;
 const start={path:state.current.path,request:state.request};const content=$('editor').value,version=state.current.version;
 state.saving=true;$('save').disabled=true;$('discard').disabled=true;
 try{
  const snapshot=await call('vault_save',{path:start.path,content,version});
  const completed=saveCompletion(start,{path:state.current?.path,request:state.request,content:$('editor').value},snapshot);
  if(completed.apply){state.current={...snapshot,kind:'md'};setDirty(completed.dirty);}
  message(completed.dirty?'Earlier draft saved; your newer edits are still unsaved.':'Saved to the vault.');
 }catch(e){if(start.request===state.request){$('draft-warning').hidden=false;$('draft-message').textContent=e.message;}message(e.message,true);}
 finally{state.saving=false;$('discard').disabled=false;$('save').disabled=!state.dirty;}
}
const colors={'1':'#c56e79','2':'#c99c6b','3':'#c7b86a','4':'#79ae95','5':'#78a6bf','6':'#b19ace'};
function renderCanvas(data) {
 const container=$('canvas-view');container.replaceChildren();const ns='http://www.w3.org/2000/svg';
 const node=(tag,attrs={},text)=>{const e=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,String(v));if(text!=null)e.textContent=text;return e;};
 const svg=node('svg',{role:'img','aria-label':'Canvas board: '+data.path.split('/').at(-1)});const bounds=canvasLayout(data.nodes);let zoom=1;
 const fit=()=>{const w=bounds.width/zoom,h=bounds.height/zoom;svg.setAttribute('viewBox',`${bounds.x+(bounds.width-w)/2} ${bounds.y+(bounds.height-h)/2} ${w} ${h}`);};fit();
 const nodes=new Map(data.nodes.map(n=>[n.id,n]));
 const edgePoint=(n,side)=>({left:[n.x,n.y+n.height/2],right:[n.x+n.width,n.y+n.height/2],top:[n.x+n.width/2,n.y],bottom:[n.x+n.width/2,n.y+n.height]}[side]??[n.x+n.width,n.y+n.height/2]);
 for(const n of data.nodes.filter(n=>n.type==='group')) {
  const color=colors[n.color]??(/^#[\da-f]{6}$/i.test(n.color??'')?n.color:'#8b819a');
  svg.append(node('rect',{x:n.x,y:n.y,width:n.width,height:n.height,rx:14,fill:color,'fill-opacity':.045,stroke:color,'stroke-opacity':.45,'stroke-width':2}));
  svg.append(node('text',{x:n.x+17,y:n.y-17,fill:color,'font-size':17,'font-family':'Segoe UI,sans-serif','font-weight':600},n.label??''));
 }
 for(const e of data.edges) {
  const from=nodes.get(e.fromNode),to=nodes.get(e.toNode);if(!from||!to)continue;
  const [x,y]=edgePoint(from,e.fromSide),[u,v]=edgePoint(to,e.toSide??'left');const color=colors[e.color]??'#83788d';
  svg.append(node('path',{d:`M ${x} ${y} C ${x+(u-x)/2} ${y}, ${u-(u-x)/2} ${v}, ${u} ${v}`,fill:'none',stroke:color,'stroke-opacity':.65,'stroke-width':2}));
  svg.append(node('circle',{cx:u,cy:v,r:4,fill:color}));
  if(e.label)svg.append(node('text',{x:(x+u)/2+6,y:(y+v)/2-7,fill:color,'font-size':12,'font-family':'Segoe UI,sans-serif'},e.label));
 }
 for(const n of data.nodes.filter(n=>n.type!=='group')) {
  const color=colors[n.color]??(/^#[\da-f]{6}$/i.test(n.color??'')?n.color:'#544a63');
  const g=node('g',{class:'canvas-card',tabindex:n.type==='file'||n.type==='link'?0:-1,role:n.type==='file'||n.type==='link'?'button':'group','aria-label':n.type==='file'?n.file:n.type==='link'?n.url:n.text?.slice(0,80)??'Card'});
  g.append(node('rect',{x:n.x,y:n.y,width:n.width,height:n.height,rx:10,fill:'#24212c',stroke:color,'stroke-width':2}));
  const title=n.type==='file'?n.file.split('/').at(-1):n.type==='link'?n.url:n.text??'';
  const text=n.type==='file'?title+'\n\n'+((n.svg||n.asset)?'':n.preview??''):title;
  if(n.svg||n.asset)g.append(node('image',{x:n.x+12,y:n.y+48,width:n.width-24,height:n.height-60,href:n.asset??svgUrl(n.svg),preserveAspectRatio:'xMidYMid meet'}));
  const words=text.replace(/[#*`>]/g,'').split(/\s+/);const lines=[];let line='';const maxChars=Math.max(15,Math.floor((n.width-36)/8));
  for(const word of words){if((line+' '+word).length>maxChars){lines.push(line);line=word;}else line+=(line?' ':'')+word;}if(line)lines.push(line);
  const limit=Math.min(Math.floor((n.height-35)/23),16);
  lines.slice(0,limit).forEach((s,i)=>g.append(node('text',{x:n.x+18,y:n.y+30+i*23,fill:n.missing?'#e7a6a6':i===0?'#eee8f3':'#b5a9c1','font-size':i===0?18:15,'font-family':'Segoe UI,sans-serif'},s)));
  if(n.type==='file') {g.onclick=()=>openFile(n.file,(n.subpath??'').replace(/^#/,''));g.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();g.onclick();}};}
  if(n.type==='link'){g.onclick=()=>openExternal(n.url);g.onkeydown=e=>{if(e.key==='Enter')g.onclick();};}
  svg.append(g);
 }
 const controls=element('div','canvas-controls');
 for(const [label,action] of [['−',()=>zoom=Math.max(.5,zoom/1.3)],['Fit',()=>zoom=1],['+',()=>zoom=Math.min(5,zoom*1.3)]]){const b=element('button','',label);b.onclick=()=>{action();fit();};controls.append(b);}
 container.append(svg,controls,element('div','canvas-caption',`${data.nodes.length} cards · ${data.edges.length} connections · click a file card to open`));
}
function renderBase(data) {
 const container=$('base-view');container.replaceChildren();const heading=element('div','base-heading');heading.append(element('h1','',data.path.split('/').at(-1).replace(/\.base$/,'')));
 const select=element('select');select.setAttribute('aria-label','Bases view');for(const v of data.views){const option=element('option','',v.name);select.append(option);}heading.append(select);const holder=element('div');
 const render=()=>{
  const view=data.views[select.selectedIndex];const table=element('table','base-table'),head=element('thead'),tr=element('tr');for(const c of view.columns)tr.append(element('th','',c.label));head.append(tr);table.append(head);
  const tbody=element('tbody');
  for(const row of view.rows){const tr=element('tr');row.values.forEach((value,i)=>{const td=element('td');const text=Array.isArray(value)?value.join(', '):String(value);if(view.columns[i].key==='file.name'){const b=element('button','note-link',text);b.onclick=()=>openFile(row.path);td.append(b);}else{td.textContent=text.replace(/\[\[([^|\]]+)(?:\|([^\]]+))?\]\]/g,(_,p,label)=>label??p.split('/').at(-1));}tr.append(td);});tbody.append(tr);}
  table.append(tbody);holder.replaceChildren(table,element('p','view-note',`${view.rows.length} notes · Table preview. Advanced Obsidian formulas are not evaluated here.`));
 };select.onchange=render;render();container.append(heading,holder);
}
async function openExternal(url){if(!/^https?:\/\//i.test(url))return;if(app)await app.openLink({url});else window.open(url,'_blank','noopener');}
async function updateContext(items) {
 const text=items.map(i=>i.text).join('\n\n---\n\n');if(text.length>20000)throw new Error('Your selected context exceeds 20,000 characters. Remove a passage first.');
 if(app)await app.updateModelContext({content:[{type:'text',text:text||'No vault passages are currently selected.'}]});
 else await call('preview_context',{text});
 state.context=items;const tray=$('context-tray');tray.hidden=!items.length;$('context-count').textContent='· '+items.length;$('context-items').replaceChildren();
 for(const item of items){const chip=element('span','context-chip',item.path.split('/').at(-1));const remove=element('button','','×');remove.setAttribute('aria-label','Remove '+item.path+' from context');remove.onclick=()=>contextAction(()=>updateContext(state.context.filter(i=>i!==item))).catch(e=>message(e.message,true));chip.append(remove);$('context-items').append(chip);}
}
function passage(){rememberSelection();if(!state.current?.content)throw new Error('Open a Markdown note first.');return sourceExcerpt(state.current.path,state.selection||trimFrontmatter(state.mode==='edit'?$('editor').value:state.current.content));}
async function copyPassage() {
 try{const text=passage();try{await navigator.clipboard.writeText(text);message('Passage copied with its source.');}catch{$('copy-text').value=text;$('copy-dialog').showModal();$('copy-text').select();}}catch(e){message(e.message,true);}
}
function showCapture() {
 const now=new Date();const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
 $('capture-path').value=(state.files.some(f=>f.path.startsWith('00 Inbox/'))?'00 Inbox/':'')+'Claude - '+date+' '+now.toISOString().slice(11,19).replace(/:/g,'')+'.md';
 $('capture-mode').value='new';$('capture-mode').querySelector('[value=append]').disabled=state.current?.kind!=='md'||state.dirty;
 $('capture-path-label').hidden=false;$('capture-path').required=true;$('capture-error').textContent='';$('capture-dialog').showModal();
}
async function capture(event) {
 event.preventDefault();const form=$('capture-form');const submit=form.querySelector('[type=submit]');submit.disabled=true;$('capture-error').textContent='';
 try {
  const content=$('capture-content').value.trim();if(!content)throw new Error('Paste the content you want to save.');
  const source=$('capture-source').value.trim();if(source&&!/^https?:\/\//i.test(source))throw new Error('Use an HTTP or HTTPS conversation link.');
  const timestamp=new Date().toISOString();let saved;
  if($('capture-mode').value==='append') {
   if(state.dirty||state.current?.kind!=='md')throw new Error('Save the current draft before appending a response.');
   saved=await call('vault_save',{path:state.current.path,version:state.current.version,content:state.current.content+'\n\n## Saved from Claude\n\nCaptured: '+timestamp+(source?'\nSource: '+source:'\nConversation link not supplied.')+'\n\n'+content+'\n'});
  } else {
   const file=$('capture-path').value.trim();const title=file.split('/').at(-1).replace(/\.md$/i,'');
   saved=await call('vault_create',{path:file,content:`---\ntype: capture\nsource: Claude Desktop\ncaptured: ${JSON.stringify(timestamp)}\n${source?'source_url: '+JSON.stringify(source)+'\n':''}---\n\n# ${title}\n\n${content}\n`});
  }
  $('capture-dialog').close();$('capture-content').value='';$('capture-source').value='';await refresh();await openFile(saved.path);message('Response saved to '+saved.path);
 } catch(e){$('capture-error').textContent=e.message;}finally{submit.disabled=false;}
}
function hostContext(context) {
 if(context?.theme)document.body.dataset.theme=context.theme;
 const modes=context?.availableDisplayModes??[];$('expand').hidden=!modes.some(m=>m==='pip'||m==='fullscreen');
 if(context?.containerDimensions?.height)$('app').style.height=Math.max(400,context.containerDimensions.height)+'px';
}
$('search').addEventListener('input',()=>{clearTimeout(state.searchTimer);state.searchTimer=setTimeout(search,220);});
document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{state.filter=b.dataset.filter;document.querySelectorAll('[data-filter]').forEach(e=>e.classList.toggle('active',e===b));search();});
$('refresh').onclick=()=>refresh().then(()=>message('Vault refreshed.')).catch(e=>message(e.message,true));
$('nav-toggle').onclick=()=>document.body.classList.toggle('nav-open');
$('edit-mode').onclick=()=>{if(state.current?.kind==='md'){showMode('edit');$('editor').focus();}};
$('read-mode').onclick=()=>{if(state.current?.kind==='md'){renderReader({...state.current,content:state.dirty?$('editor').value:state.current.content});showMode('read');}};
$('editor').addEventListener('input',()=>setDirty($('editor').value!==state.current.content));
$('save').onclick=save;
$('discard').onclick=()=>{setDirty(false);openFile(state.current.path);};
for(const id of ['use-passage','copy-passage'])$(id).addEventListener('mousedown',e=>e.preventDefault());
document.addEventListener('selectionchange',rememberSelection);$('editor').addEventListener('select',rememberSelection);
$('use-passage').onclick=async()=>{try{const text=passage(),path=state.current.path;await contextAction(()=>updateContext([...state.context,{path,text}]));message(previewToken?'Preview: passage staged locally. In Claude it becomes context for your next message.':'Passage added as context. Write your next message when ready.');}catch(e){message(e.message,true);}};
$('copy-passage').onclick=copyPassage;$('copy-close').onclick=()=>$('copy-dialog').close();
$('capture').onclick=showCapture;$('capture-cancel').onclick=()=>$('capture-dialog').close();$('capture-form').onsubmit=capture;
$('capture-mode').onchange=()=>{const fresh=$('capture-mode').value==='new';$('capture-path-label').hidden=!fresh;$('capture-path').required=fresh;};
$('reader').addEventListener('click',e=>{const a=e.target.closest('a');if(!a)return;e.preventDefault();if(a.dataset.note)openFile(a.dataset.note,a.dataset.anchor??'');else openExternal(a.href);});
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();document.body.classList.add('nav-open');$('search').focus();}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();save();}});
window.addEventListener('beforeunload',e=>{if(state.dirty){e.preventDefault();e.returnValue='';}});
$('expand').onclick=async()=>{try{const context=app?.getHostContext();const mode=context?.displayMode==='inline'?(context.availableDisplayModes?.includes('pip')?'pip':'fullscreen'):'inline';await app.requestDisplayMode({mode});}catch(e){message(e.message,true);}};
async function initialize() {
 if(previewToken){document.body.classList.add('preview');$('connection').textContent='Local preview · live vault files';await refresh();await openFile('Home.md');return;}
 app=new App({name:'Atelier Obsidian',version:'0.1.0'},{availableDisplayModes:['inline','fullscreen','pip']});
 let initialized=false;
 app.ontoolresult=result=>{if(!initialized&&result.structuredContent?.files){initialized=true;state.files=result.structuredContent.files;$('vault-name').textContent=result.structuredContent.name;$('file-count').textContent=state.files.length+' files';renderTree();openFile('Home.md');}};
 app.onhostcontextchanged=hostContext;
 await app.connect();$('connection').textContent='Connected to Claude';hostContext(app.getHostContext());
 if(!initialized){await refresh();await openFile('Home.md');}
}
initialize().catch(e=>{$('connection').textContent='Connection unavailable';$('reader').replaceChildren(element('div','empty','The panel could not connect: '+e.message));});
