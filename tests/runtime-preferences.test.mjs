import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createRuntimePreferences} from '../src/desktop/runtime-preferences.mjs';
import {applyDemoMinimalUi} from '../src/desktop/minimal-ui.mjs';
import {createRuntimePrototype} from '../src/desktop/runtime-prototype.mjs';

async function fixture(t){const root=await fs.mkdtemp(path.join(os.tmpdir(),'atelier-controls-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));return{root,file:path.join(root,'settings','runtime.json')};}

test('controls default to minimal and survive a fresh preferences instance',async t=>{
 const {file}=await fixture(t),changes=[];
 const settings=createRuntimePreferences(file,{apply:async mode=>changes.push(mode)});
 assert.deepEqual(await settings.get(),{controls:'minimal'});
 assert.deepEqual(await settings.set('all'),{controls:'all'});
 assert.deepEqual(changes,['all']);
 assert.deepEqual(await createRuntimePreferences(file).get(),{controls:'all'});
 await settings.set('minimal');assert.equal((await createRuntimePreferences(file).get()).controls,'minimal');
});

test('invalid modes and malformed saved preferences are preserved without applying changes',async t=>{
 const {file}=await fixture(t);let calls=0;
 const settings=createRuntimePreferences(file,{apply:async()=>{calls++;}});
 await assert.rejects(settings.set('hidden'),/minimal.*all/i);assert.equal(calls,0);
 await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,'invalid json','utf8');
 await assert.rejects(settings.get(),/saved.*preserved/i);await assert.rejects(settings.set('all'),/saved.*preserved/i);
 assert.equal(await fs.readFile(file,'utf8'),'invalid json');assert.equal(calls,0);
});

test('a failed live change preserves the previous saved choice and later changes still work',async t=>{
 const {file}=await fixture(t);let fail=false;
 const settings=createRuntimePreferences(file,{apply:async()=>{if(fail)throw new Error('Snippet is read-only');}});
 await settings.set('all');fail=true;await assert.rejects(settings.set('minimal'),/read-only/);
 assert.equal((await createRuntimePreferences(file).get()).controls,'all');
 fail=false;await settings.set('minimal');assert.equal((await settings.get()).controls,'minimal');
});

test('startup application and rapid preference changes are serialized in the selected order',async t=>{
 const {file}=await fixture(t),events=[];let release;
 const pending=new Promise(resolve=>{release=resolve;});
 const settings=createRuntimePreferences(file,{apply:async mode=>events.push(mode)});
 const opening=settings.withCurrent(async value=>{events.push('opening:'+value.controls);await pending;});
 const all=settings.set('all'),minimal=settings.set('minimal');release();await Promise.all([opening,all,minimal]);
 assert.deepEqual(events,['opening:minimal','all','minimal']);assert.equal((await settings.get()).controls,'minimal');
});

test('switching to all removes only the minimal block and retains the vault stylesheet',async t=>{
 const {root,file}=await fixture(t),vault=path.join(root,'vault'),snippets=path.join(vault,'.obsidian','snippets');
 await fs.mkdir(snippets,{recursive:true});const snippet=path.join(snippets,'atelier.css'),original='/* Vault styles */\nbody { color: red; }\n';await fs.writeFile(snippet,original,'utf8');
 const settings=createRuntimePreferences(file,{apply:mode=>applyDemoMinimalUi(process.cwd(),vault,{restore:mode==='all'})});
 await settings.set('minimal');assert.match(await fs.readFile(snippet,'utf8'),/atelier:claude-minimal:start/);
 await settings.set('all');assert.equal(await fs.readFile(snippet,'utf8'),original);assert.equal(await fs.readFile(snippet+'.before-claude-minimal','utf8'),original);
});

test('runtime preference actions work before opening a demo window',async t=>{
 const {root,file}=await fixture(t),request=createRuntimePrototype({project:root,preferencesFile:file});
 assert.deepEqual(await request(null,'runtime.preferences.get'),{controls:'minimal'});
 assert.deepEqual(await request(null,'runtime.preferences.set',{controls:'all'}),{controls:'all'});
 assert.equal((await createRuntimePrototype({project:root,preferencesFile:file})(null,'runtime.preferences.get')).controls,'all');
});
