import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorkspaceState} from '../src/desktop/workspace-state.mjs';

const storage=()=>{const values=new Map();return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};};

test('layout, visibility, and independent note scroll positions survive a new workspace instance',()=>{
 const disk=storage(),first=createWorkspaceState(disk);
 first.setLayout('dock');first.setVisible(true);
 first.rememberDocument('personal','Home.md',{scrollTop:420});first.rememberDocument('work','Home.md',{scrollTop:88});first.flush();
 const reopened=createWorkspaceState(disk);
 assert.equal(reopened.layout,'dock');assert.equal(reopened.visible,true);
 assert.equal(reopened.document('personal','Home.md').scrollTop,420);
 assert.equal(reopened.document('work','Home.md').scrollTop,88);
 reopened.setVisible(false);reopened.flush();assert.equal(createWorkspaceState(disk).visible,false);
});

test('Canvas position and Bases selection persist without replacing the note scroll position',()=>{
 const disk=storage(),state=createWorkspaceState(disk);
 state.rememberDocument('a','Board.canvas',{scrollTop:20});state.rememberDocument('a','Board.canvas',{canvas:{x:-22,y:13,width:800,height:400},base:2});state.flush();
 assert.deepEqual(createWorkspaceState(disk).document('a','Board.canvas'),{scrollTop:20,base:2,canvas:{x:-22,y:13,width:800,height:400}});
});

test('corrupt state and unavailable browser storage do not prevent opening the vault',()=>{
 const broken={getItem(){throw new Error('Storage unavailable');},setItem(){throw new Error('Storage unavailable');}};
 const state=createWorkspaceState(broken);assert.equal(state.layout,'full');state.setLayout('dock');state.flush();
 const corrupt=createWorkspaceState({getItem:()=>'{bad json',setItem(){}});assert.deepEqual(corrupt.document('a','Home.md'),{scrollTop:0,base:0});
});
