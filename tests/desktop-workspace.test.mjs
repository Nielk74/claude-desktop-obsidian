import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {build} from 'esbuild';

class Element{
 constructor(tag){this.tagName=tag;this.children=[];this.attributes={};this.style={};this.value='';this.className='';this._text='';this.classList={add:name=>this.className+=' '+name};}
 set textContent(value){this._text=String(value);this.children=[];}get textContent(){return this._text+this.children.map(c=>typeof c==='string'?c:c.textContent).join('');}
 append(...children){for(const child of children){if(typeof child!=='string')child.parentElement=this;this.children.push(child);}}
 prepend(child){child.parentElement=this;this.children.unshift(child);}
 replaceChildren(...children){this.children=[];this._text='';this.append(...children);}
 remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(c=>c!==this);}
 after(child){const p=this.parentElement;if(p){child.parentElement=p;p.children.splice(p.children.indexOf(this)+1,0,child);}}
 setAttribute(key,value){this.attributes[key]=String(value);}getAttribute(key){return this.attributes[key];}
 attachShadow(){this.shadowRoot=new Element('shadow');return this.shadowRoot;}
 addEventListener(){}focus(){}
 all(){return this.children.flatMap(c=>typeof c==='string'?[]:[c,...c.all()]);}
 querySelector(selector){const parts=selector.split(' ');let nodes=[this];for(const part of parts){nodes=nodes.flatMap(n=>n.all().filter(c=>part.startsWith('.')?c.className.split(' ').includes(part.slice(1)):part==='input[type=search]'?c.tagName==='input'&&c.type==='search':c.tagName===part));}return nodes[0]??null;}
}
let compiled;
async function fixture({storage}={}){
 compiled??=(await build({entryPoints:['src/desktop/workspace.mjs'],bundle:true,write:false,format:'iife',globalName:'AtelierWorkspace',loader:{'.css':'text'},plugins:[{name:'render-adapters',setup(b){b.onResolve({filter:/^dompurify$|presentation\.js$/},args=>({path:args.path,namespace:'test-render'}));b.onLoad({filter:/.*/,namespace:'test-render'},args=>({contents:args.path==='dompurify'?'export default {sanitize:x=>x};':'export const canvasSvg=()=>"",baseMarkdown=()=>"";'}));}}]})).outputFiles[0].text;
 const context={document:{createElement:tag=>new Element(tag)},console,navigator:{clipboard:{writeText:async()=>{}}},setTimeout,clearTimeout};vm.runInNewContext(compiled,context);
 const host=new Element('host'),state={version:1,activeId:'a',vaults:[{id:'a',name:'Personal',path:'C:\\Personal',lastNote:'Home.md'},{id:'b',name:'Work',path:'C:\\Work',lastNote:'Home.md'}]},requests=[];let trap;
 const request=async r=>{
  requests.push(structuredClone(r));if(trap?.predicate(r)){const t=trap;trap=null;t.started();await t.gate;}
  if(r.action==='catalog.activate')state.activeId=r.vaultId;
  if(r.action==='catalog.rename')state.vaults.find(v=>v.id===r.vaultId).name=r.args.name;
  if(r.action==='catalog.add'){state.vaults.push({id:'c',name:'Research',path:r.args.path,lastNote:'Home.md'});state.activeId='c';}
  if(r.action.startsWith('catalog.'))return structuredClone(state);
  if(r.action==='vault.list')return {name:state.vaults.find(v=>v.id===r.vaultId).name,files:[{path:'Home.md',name:'Home.md',kind:'md',folder:''},{path:'Other.md',name:'Other.md',kind:'md',folder:''}]};
  return {path:r.args.path,kind:'md',content:r.action==='vault.save'?r.args.content:'ORIGINAL',version:'v1',size:8};
 };
 const layouts=[],ui=context.AtelierWorkspace.mountWorkspace(host,request,{storage,setLayout:layout=>layouts.push(layout),onClose(){}});await ui.show();
 const button=label=>host.shadowRoot.all().find(e=>e.tagName==='button'&&(e.textContent===label||e.textContent.replace(/[·▦▤]/g,'').trim()===label));
 const press=async label=>{const b=button(label);assert.ok(b,'Missing button '+label);if(b.onclick)return b.onclick();if(b.type==='submit')return b.parentElement.onsubmit({preventDefault(){}});throw new Error('Button has no action: '+label);};
 const editor=()=>host.shadowRoot.all().find(e=>e.tagName==='textarea');
 const type=text=>{const e=editor();assert.ok(e,'Editor missing');e.value=text;e.oninput();};
 const hold=predicate=>{let release,started;const gate=new Promise(r=>release=r),waiting=new Promise(r=>started=r);trap={predicate,gate,started};return {waiting,release};};
 return {host,state,requests,press,editor,type,hold,button,ui,layouts};
}
test('a delayed note read cannot erase text typed into the previous editor',async()=>{
 const f=await fixture();await f.press('Edit');const h=f.hold(r=>r.action==='vault.read'&&r.args.path==='Other.md');const pending=f.press('Other');await h.waiting;f.type('KEEP NEW DRAFT');h.release();await pending;
 assert.equal(f.editor()?.value,'KEEP NEW DRAFT');
});
test('delayed vault activation preserves a draft typed while activation is pending',async()=>{
 const f=await fixture();await f.press('Edit');const h=f.hold(r=>r.action==='catalog.activate');const pending=f.press('Work');await h.waiting;f.type('PERSONAL DRAFT');h.release();await pending;
 assert.equal(f.editor()?.value,'PERSONAL DRAFT');await f.press('Save changes');assert.equal(f.requests.filter(r=>r.action==='vault.save').at(-1)?.vaultId,'a');
});
test('external catalog selection and a rename cannot redirect a draft into another vault',async()=>{
 const f=await fixture();await f.press('Edit');f.type('PERSONAL ONLY');await f.press('Manage vaults');f.state.activeId='b';await f.press('Rename');await f.press('← Back to notes');await f.press('Save changes');
 assert.equal(f.requests.filter(r=>r.action==='vault.save').at(-1)?.vaultId,'a');
});

test('a delayed vault addition preserves a draft created after returning from setup',async()=>{
 const f=await fixture();await f.press('Manage vaults');const field=f.host.shadowRoot.all().find(e=>e.tagName==='label'&&e.textContent.startsWith('Vault folder'));const input=field.children.find(e=>e.tagName==='input');input.value='C:\\Research';input.oninput();
 const h=f.hold(r=>r.action==='catalog.add');const pending=f.press('Add vault');await h.waiting;await f.press('← Back to notes');await f.press('Edit');f.type('KEEP PERSONAL DRAFT');h.release();await pending;await new Promise(setImmediate);
 assert.equal(f.editor()?.value,'KEEP PERSONAL DRAFT');
});

test('closing and recreating the workspace restores its layout and the note scroll position',async()=>{
 const values=new Map(),storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
 const first=await fixture({storage});await new Promise(r=>setTimeout(r,5));
 const content=first.host.shadowRoot.querySelector('.document-content');content.scrollTop=420;content.onscroll();
 await first.press('Beside chat');await new Promise(r=>setTimeout(r,5));await first.press('Close');
 first.host.shadowRoot.querySelector('.document-content').scrollTop=0;
 await first.ui.show();await new Promise(r=>setTimeout(r,5));
 assert.equal(first.host.shadowRoot.querySelector('.document-content').scrollTop,420,'Hidden content must not overwrite the saved scroll offset');
 await first.press('Close');
 const next=await fixture({storage});await new Promise(r=>setTimeout(r,5));
 assert.equal(next.layouts.at(-1),'dock');assert.equal(next.host.shadowRoot.querySelector('.document-content').scrollTop,420);
});
