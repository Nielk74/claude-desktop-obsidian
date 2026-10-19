import test from 'node:test';
import assert from 'node:assert/strict';
import {createControlSettings} from '../src/desktop/control-settings.mjs';

function fixture(request){
 class Element{
  constructor(tag){this.tagName=tag;this.children=[];this.dataset={};this.style={};this.attributes={};this.isConnected=true;}
  append(...nodes){this.children.push(...nodes);}prepend(node){this.children.unshift(node);}setAttribute(key,value){this.attributes[key]=value;}
  attachShadow(){return this.shadowRoot=new Element('shadow');}querySelector(){return this.children.find(node=>node.dataset.atelierControlSettings!==undefined);}
  showModal(){this.open=true;}close(){this.open=false;}focus(){this.focused=true;}
 }
 let slotAvailable=true;const panel=new Element('section'),body=new Element('body'),document={body,createElement:tag=>new Element(tag),querySelectorAll:selector=>slotAvailable&&selector==='[data-atelier-settings-slot="obsidian-controls"]'?[panel]:[]};let opened=0;
 const settings=createControlSettings(document,request,{onOpen:()=>{opened++;}});
 const descendants=node=>[node,...node.children.flatMap(descendants),...(node.shadowRoot?descendants(node.shadowRoot):[])];
 const find=(tag,root=panel)=>descendants(root).find(n=>n.tagName===tag);
 return{settings,panel,body,find,opened:()=>opened,setSlotAvailable:value=>{slotAvailable=value;}};
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));

test('native settings contain one labeled choice, load the saved value and save a change',async()=>{
 const requests=[];const f=fixture(async r=>{requests.push(r);return{ok:true,value:{controls:r.args?.controls??'all'}};});
 f.settings.attach();f.settings.attach();await tick();assert.equal(f.panel.children.length,1);
 const select=f.find('select');assert.equal(select.value,'all');assert.equal(select.disabled,false);assert.equal(select.attributes['aria-label'],'Obsidian controls');
 select.value='minimal';await select.onchange();assert.deepEqual(requests.at(-1),{action:'runtime.preferences.set',args:{controls:'minimal'}});assert.equal(f.find('p').textContent,'Saved');
});

test('a failed save reports the error and restores the saved selection',async()=>{
 const f=fixture(async r=>r.action.endsWith('.get')?{ok:true,value:{controls:'minimal'}}:{ok:false,message:'Could not write preferences'});
 f.settings.attach();await tick();const select=f.find('select');select.value='all';await select.onchange();
 assert.equal(select.value,'minimal');assert.equal(select.disabled,false);assert.match(f.find('p').textContent,/Could not write/);
});

test('unrelated settings panels cannot receive the row or close the embedded view',async()=>{
 const f=fixture(async()=>({ok:true,value:{controls:'all'}}));f.setSlotAvailable(false);f.settings.attach();await tick();
 assert.equal(f.opened(),0);assert.equal(f.panel.children.length,0);assert.equal(f.body.children.length,0);
});

test('reopening native settings refreshes a preference changed by another Claude window',async()=>{
 let controls='minimal',reads=0;const f=fixture(async()=>{reads++;return{ok:true,value:{controls}};});
 f.settings.attach();await tick();assert.equal(f.find('select').value,'minimal');
 f.panel.children[0].isConnected=false;f.panel.children=[];controls='all';
 f.settings.attach();await tick();assert.equal(f.find('select').value,'all');assert.equal(reads,2);
});
