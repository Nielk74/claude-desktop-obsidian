import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {build} from 'esbuild';

let compiled;
async function fixture(defer=false){
 compiled??=(await build({entryPoints:['src/desktop/navigation.mjs'],bundle:true,write:false,format:'iife'})).outputFiles[0].text;
 class Element{
  constructor(tag='div'){this.tagName=tag;this.style={};this.children=[];this.attributes=new Map();this.listeners=new Map();this.isConnected=true;this.textContent='';}
  append(child){if(child.parentElement)child.parentElement.children=child.parentElement.children.filter(n=>n!==child);child.parentElement=this;this.children.push(child);}
  setAttribute(k,v){this.attributes.set(k,v);}contains(child){return this.children.includes(child)||this.children.some(n=>n.contains(child));}getBoundingClientRect(){return{width:280};}
  addEventListener(event,callback){this.listeners.set(event,callback);}click(){this.listeners.get('click')?.();return this.onclick?.();}
 }
 const body=new Element('body'),group=new Element(),code=new Element('button'),cowork=new Element('button');code.textContent='Code';cowork.textContent='Cowork';group.append(cowork);group.append(code);body.append(group);
 const walk=node=>[node,...node.children.flatMap(walk)],document={body,createElement:tag=>new Element(tag),querySelectorAll:selector=>selector.startsWith('[data-atelier')?[]:walk(body).filter(n=>n.tagName==='button')};
 const requests=[];let finish;const pending=new Promise(resolve=>{finish=resolve;});
 let onMutation;const context={document,window:{atelierObsidian:{request:async request=>{requests.push(request);if(defer&&request.action==='runtime.prototype.show')await pending;return{ok:true,value:{visible:true}};}},addEventListener(){}},console,getComputedStyle:()=>({display:'flex'}),MutationObserver:class{constructor(callback){onMutation=callback;}observe(){}},requestAnimationFrame(callback){callback();},cancelAnimationFrame(){}};
 context.window.location={href:'app://localhost/code/one'};context.window.history={pushState(_state,_title,url){if(url)context.window.location.href=new URL(url,context.window.location.href).href;},replaceState(_state,_title,url){if(url)context.window.location.href=new URL(url,context.window.location.href).href;}};
 vm.runInNewContext(compiled,context);
 return{body,group,code,cowork,tab:group.children.find(n=>n!==code&&n!==cowork),requests,finish,refresh:()=>onMutation(),navigate:route=>context.window.history.pushState(null,'',route)};
}

test('one Obsidian tab opens the actual renderer without mounting the retired custom viewer',async()=>{
 const {body,group,tab,requests}=await fixture();assert.ok(tab);assert.equal(body.children.length,1);assert.equal(group.children.length,3);assert.equal(requests.length,0);
 await tab.click();assert.equal(requests.at(-1).action,'runtime.prototype.show');assert.equal(tab.attributes.get('aria-pressed'),'true');
 await tab.click();assert.equal(requests.at(-1).action,'runtime.prototype.hide');assert.equal(tab.attributes.get('aria-pressed'),'false');
});

test('Code and Cowork close the actual renderer',async()=>{
 const {tab,code,cowork,requests}=await fixture();for(const destination of [code,cowork]){await tab.click();destination.click();assert.equal(requests.at(-1).action,'runtime.prototype.hide');}
});

test('leaving while actual Obsidian loads cancels its pending visibility',async()=>{
 const {tab,code,requests,finish}=await fixture(true);const opening=tab.click();code.click();assert.equal(requests.at(-1).action,'runtime.prototype.hide');
 finish();await opening;assert.equal(tab.attributes.get('aria-pressed'),'false');assert.equal(tab.disabled,false);
});

test('ordinary SPA navigation hides actual Obsidian instead of covering the new chat',async()=>{
 const {tab,requests,navigate}=await fixture();await tab.click();navigate('/new');assert.equal(requests.at(-1).action,'runtime.prototype.hide');assert.equal(tab.attributes.get('aria-pressed'),'false');
});

test('Obsidian remains accessible when native modes disappear from a still-connected container',async()=>{
 const {body,group,tab,code,cowork,refresh}=await fixture();group.children=[tab];refresh();assert.equal(tab.parentElement,body);assert.match(tab.style.cssText,/position:fixed/);
 group.append(code);group.append(cowork);refresh();assert.equal(tab.parentElement,group);
});
