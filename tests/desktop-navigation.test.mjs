import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {build} from 'esbuild';

let compiled;
async function fixture(savedLayout,deferRuntimeShow=false){
 compiled??=(await build({entryPoints:['src/desktop/navigation.mjs'],bundle:true,write:false,format:'iife',plugins:[{name:'workspace-boundary',setup(b){b.onResolve({filter:/^\.\/workspace\.mjs$/},()=>({path:'workspace',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:'export function mountWorkspace(host,request,{setLayout}){return {preferences:{visible:false,layout:savedLayout},show(layout=savedLayout){setLayout(layout);},hide(){}};}'}));}}]})).outputFiles[0].text;
 class Element{
  constructor(){this.dataset={};this.attributes=new Map();this.style={};this.children=[];this.isConnected=true;}
  append(child){this.children.push(child);}setAttribute(k,v){this.attributes.set(k,v);}removeAttribute(k){this.attributes.delete(k);}hasAttribute(k){return this.attributes.has(k);}
 }
 const body=new Element(),main=new Element(),document={body,documentElement:new Element(),createElement:()=>new Element(),querySelector:()=>main,querySelectorAll:()=>[],getElementById:id=>body.children.find(e=>e.id===id)};
 document.documentElement.dataset.mode='dark';
 const requests=[];let finishRuntimeShow;const showPending=new Promise(resolve=>{finishRuntimeShow=resolve;});
 const context={savedLayout,document,window:{atelierObsidian:{request:async request=>{requests.push(request);if(deferRuntimeShow&&request.action==='runtime.prototype.show')await showPending;return{ok:true,value:{}};}},addEventListener(){}},getComputedStyle:()=>({backgroundColor:'rgb(20,20,20)'}),innerWidth:1920,innerHeight:1080,matchMedia:()=>({addEventListener(){}}),MutationObserver:class{observe(){}},requestAnimationFrame(){},cancelAnimationFrame(){}};
 context.window.location={href:'app://localhost/code/one'};context.window.history={pushState(_state,_title,url){if(url)context.window.location.href=new URL(url,context.window.location.href).href;},replaceState(_state,_title,url){if(url)context.window.location.href=new URL(url,context.window.location.href).href;}};
 vm.runInNewContext(compiled,context);
 return {host:body.children.find(e=>e.id==='atelier-obsidian-workspace'),side:body.children.find(e=>e.id==='atelier-obsidian-side-access'),prototype:body.children.find(e=>e.id==='atelier-obsidian-runtime-demo'),requests,finishRuntimeShow,navigate:route=>context.window.history.pushState(null,'',route)};
}

test('the Vaults button reopens an expanded workspace in its saved expanded layout',async()=>{
 const {host,side}=await fixture('full');side.onclick();
 assert.equal(host.dataset.layout,'full');assert.equal(host.hasAttribute('data-visible'),true);
 side.onclick();assert.equal(host.hasAttribute('data-visible'),false);side.onclick();assert.equal(host.dataset.layout,'full');
});

test('the Vaults button preserves a saved docked layout and toggles it closed',async()=>{
 const {host,side}=await fixture('dock');side.onclick();
 assert.equal(host.dataset.layout,'dock');side.onclick();assert.equal(host.hasAttribute('data-visible'),false);
});

test('the actual-runtime demo has a direct button and closes when the regular workspace is opened',async()=>{
 const {prototype,side,requests}=await fixture('full');assert.ok(prototype,'A visible actual-runtime button is required');
 await prototype.onclick();assert.equal(requests.at(-1).action,'runtime.prototype.show');
 side.onclick();assert.equal(requests.at(-1).action,'runtime.prototype.hide');
});

test('opening the regular workspace while the actual runtime loads cancels its pending visibility',async()=>{
 const {prototype,side,requests,finishRuntimeShow}=await fixture('full',true);
 const opening=prototype.onclick();side.onclick();assert.equal(requests.at(-1).action,'runtime.prototype.hide');
 finishRuntimeShow();await opening;assert.equal(prototype.textContent,'◇ Actual Obsidian · demo');
});

test('ordinary SPA navigation hides the actual runtime instead of covering the new chat',async()=>{
 const {prototype,requests,navigate}=await fixture('full');await prototype.onclick();navigate('/new');
 assert.equal(requests.at(-1).action,'runtime.prototype.hide');assert.equal(prototype.textContent,'◇ Actual Obsidian · demo');
});
