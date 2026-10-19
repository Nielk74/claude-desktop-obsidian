import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {EventEmitter} from 'node:events';
import {build} from 'esbuild';
import {measureRuntimeLayout,fitRuntimeBounds} from '../src/desktop/runtime-layout.mjs';
import {createRuntimePrototype} from '../src/desktop/runtime-prototype.mjs';

function documentFixture(right=360,bottom=36){
 const sidebar={getBoundingClientRect:()=>({right,width:360,height:900})},chrome={getBoundingClientRect:()=>({bottom,width:2000,height:36})};
 return{querySelector:selector=>selector==='.dframe-sidebar'?sidebar:selector==='.dframe-chrome-bar'?chrome:null};
}

test('the view starts at the actual sidebar and title-bar edges, accounting for interface zoom',()=>{
 const layout=measureRuntimeLayout(documentFixture(),{width:2000,height:1200});
 assert.deepEqual(fitRuntimeBounds([1600,960],layout),{x:288,y:29,width:1312,height:931});
});

test('expanded and collapsed sidebars fit without leaving a fixed-width gap',()=>{
 assert.deepEqual(fitRuntimeBounds([1440,940],measureRuntimeLayout(documentFixture(420),{width:1440,height:940})),{x:420,y:36,width:1020,height:904});
 assert.equal(fitRuntimeBounds([1440,940],measureRuntimeLayout(documentFixture(0),{width:1440,height:940})).x,0);
 assert.equal(fitRuntimeBounds([1440,940],measureRuntimeLayout(documentFixture(-280),{width:1440,height:940})).x,0);
});

test('small windows stay within the content area and invalid geometry is rejected',()=>{
 const layout=measureRuntimeLayout(documentFixture(500,100),{width:320,height:80}),bounds=fitRuntimeBounds([320,80],layout);
 assert.ok(bounds.x>=0&&bounds.y>=0&&bounds.x+bounds.width===320&&bounds.y+bounds.height===80);
 assert.throws(()=>fitRuntimeBounds([800,600],{left:NaN,top:36,viewport:{width:800,height:600}}),/layout/i);
 assert.throws(()=>fitRuntimeBounds([800,600],{left:200,top:-1,viewport:{width:800,height:600}}),/layout/i);
 assert.throws(()=>fitRuntimeBounds([800,600],{left:200,top:36,viewport:{width:0,height:600}}),/layout/i);
});

test('layout can be supplied before the runtime opens without starting Obsidian',async()=>{
 const request=createRuntimePrototype({project:process.cwd()}),window={getContentSize:()=>[1600,960]};
 const layout=measureRuntimeLayout(documentFixture(),{width:2000,height:1200});
 assert.deepEqual(await request(window,'runtime.prototype.layout',{layout}),{bounds:{x:288,y:29,width:1312,height:931}});
 await assert.rejects(request(window,'runtime.prototype.layout',{layout:{...layout,left:Infinity}}),/layout/i);
});

test('reopening an existing view applies sidebar changes made while hidden',async()=>{
 const source=await build({entryPoints:['src/desktop/runtime-prototype.mjs'],bundle:true,write:false,platform:'node',format:'cjs',plugins:[{name:'css-boundary',setup(builder){builder.onResolve({filter:/minimal-ui\.mjs$/},()=>({path:'css',namespace:'test'}));builder.onLoad({filter:/.*/,namespace:'test'},()=>({contents:'export async function applyDemoMinimalUi(){}'}));}}]});
 let bounds;const factory=options=>{bounds=options.bounds();return{resize:()=>{bounds=options.bounds();},setVisible(){},dispose(){}};};
 const actualRequire=createRequire(import.meta.url),module={exports:{}},io={access:async()=>{},mkdir:async()=>{},readFile:async()=>{throw Object.assign(new Error('missing'),{code:'ENOENT'});}};
 vm.runInNewContext(source.outputFiles[0].text,{module,exports:module.exports,require:name=>name==='node:fs'?{existsSync:()=>true,writeFileSync(){}}:name==='node:fs/promises'?io:name==='node:module'?{createRequire:()=>()=>factory}:actualRequire(name),process,Buffer,console,setTimeout,clearTimeout});
 const host=new EventEmitter();host.id=1;host.isDestroyed=()=>false;host.getContentSize=()=>[1000,800];
 const request=module.exports.createRuntimePrototype({project:process.cwd()}),layout={left:280,top:36,viewport:{width:1000,height:800}};
 await request(host,'runtime.prototype.show',{layout});assert.equal(bounds.x,280);await request(host,'runtime.prototype.hide');
 await request(host,'runtime.prototype.show',{layout:{...layout,left:400}});assert.equal(bounds.x,400);
});

test('a collapsed sidebar pop-out reserves its full visible width',()=>{
 let hovering=false;const root={hasAttribute:name=>name==='data-collapsed'||name==='data-hovering'&&hovering};
 const aside={closest:()=>root,getBoundingClientRect:()=>({right:160,width:160,height:32})},popup={getBoundingClientRect:()=>({right:300,width:280,height:700})};
 const document={querySelector:selector=>selector==='.dframe-sidebar'?aside:selector==='.dframe-sidebar-body'?popup:null},viewport={width:1600,height:900};
 assert.equal(measureRuntimeLayout(document,viewport).left,160);hovering=true;assert.equal(measureRuntimeLayout(document,viewport).left,300);
});
