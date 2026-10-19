import test from 'node:test';
import assert from 'node:assert/strict';
import {createCanvasCamera} from '../src/desktop/canvas-view.mjs';

test('Canvas zoom keeps the world point under the pointer stationary',()=>{
 const camera=createCanvasCamera({x:0,y:0,width:1000,height:500});
 camera.fit(1000,500);
 camera.zoom(2,.25,.5);
 assert.deepEqual(camera.view,{x:125,y:125,width:500,height:250});
 camera.pan(100,-50,1000,500);
 assert.deepEqual(camera.view,{x:75,y:150,width:500,height:250});
});

test('Canvas fit includes the full board without stretching and resets a moved viewport',()=>{
 const camera=createCanvasCamera({x:-100,y:-50,width:1000,height:500});
 camera.fit(500,500);
 assert.deepEqual(camera.view,{x:-100,y:-300,width:1000,height:1000});
 camera.pan(1000,1000,500,500);camera.zoom(10,.5,.5);camera.fit(500,500);
 assert.deepEqual(camera.view,{x:-100,y:-300,width:1000,height:1000});
});

test('restored Canvas views survive resize while invalid saved viewports fall back to fit',()=>{
 const camera=createCanvasCamera({x:0,y:0,width:1000,height:500},{x:100,y:200,width:400,height:200});
 camera.resize(400,400);
 assert.deepEqual(camera.view,{x:200,y:200,width:200,height:200});
 const invalid=createCanvasCamera({x:0,y:0,width:1000,height:500},{x:Infinity,y:0,width:-1,height:0});
 invalid.fit(1000,500);assert.deepEqual(invalid.view,{x:0,y:0,width:1000,height:500});
 for(let i=0;i<100;i++)invalid.zoom(100,.5,.5);
 assert.ok(Number.isFinite(invalid.view.x)&&invalid.view.width>=31.25);
});
