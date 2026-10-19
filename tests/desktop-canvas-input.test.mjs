import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {build} from 'esbuild';

test('Canvas wheel zoom and pointer dragging update the rendered viewport without opening a card',async()=>{
 class Element{
  constructor(tag){this.tag=tag;this.children=[];this.attrs={};this.listeners={};this.captured=new Set();this.classList={add(){},remove(){}};}
  append(...children){this.children.push(...children);}
  set innerHTML(value){this.children=[new Element('svg')];}
  querySelector(tag){return this.children.find(c=>c.tag===tag);}
  setAttribute(key,value){this.attrs[key]=value;}
  addEventListener(type,fn){this.listeners[type]=fn;}
  getBoundingClientRect(){return {left:20,top:30,width:1000,height:500};}
  focus(){}setPointerCapture(id){this.captured.add(id);}hasPointerCapture(id){return this.captured.has(id);}releasePointerCapture(id){this.captured.delete(id);}
 }
 const source=(await build({entryPoints:['src/desktop/canvas-view.mjs'],bundle:true,write:false,format:'iife',globalName:'CanvasUI',plugins:[{name:'svg-dom-adapter',setup(b){b.onResolve({filter:/^dompurify$/},()=>({path:'purify',namespace:'adapter'}));b.onLoad({filter:/.*/,namespace:'adapter'},()=>({contents:'export default {sanitize:x=>x};'}));}}]})).outputFiles[0].text;
 const context={document:{createElement:tag=>new Element(tag)},requestAnimationFrame:fn=>fn(),console};vm.runInNewContext(source,context);
 let opened=false;const host=new Element('div'),ui=context.CanvasUI.mountCanvas(host,{path:'Board.canvas',nodes:[{id:'a',type:'text',text:'A card',x:0,y:0,width:1000,height:500}],edges:[]},{openFile(){opened=true;}}),frame=host.children[0];
 const initial=ui.view;let prevented=false;
 frame.listeners.wheel({deltaY:-Math.log(2)/.002,deltaMode:0,clientX:270,clientY:280,preventDefault(){prevented=true;}});
 assert.equal(prevented,true);assert.equal(ui.view.width,580);assert.equal(ui.view.height,290);
 assert.equal(ui.view.x,65);assert.equal(ui.view.y,105);
 frame.onpointerdown({button:0,pointerId:1,clientX:100,clientY:100,preventDefault(){}});
 frame.onpointermove({pointerId:1,clientX:200,clientY:150});frame.onpointerup({pointerId:1});
 assert.equal(ui.view.x,7);assert.equal(ui.view.y,76);assert.equal(frame.captured.size,0);assert.equal(opened,false);
 const controls=host.children[1],fit=controls.children.find(c=>c.textContent==='Fit');fit.onclick();
 assert.equal(ui.view.x,initial.x);assert.equal(ui.view.width,initial.width);ui.dispose();
});
