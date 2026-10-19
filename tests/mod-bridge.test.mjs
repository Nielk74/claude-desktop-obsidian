import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createCatalogService} from '../src/catalog-service.mjs';

const helper=fileURLToPath(new URL('../src/mod-bridge.mjs',import.meta.url));
function invoke(request) {
 return new Promise((resolve,reject)=>{
  const p=spawn(process.execPath,[helper],{windowsHide:true,stdio:['pipe','pipe','pipe']});let stdout='',stderr='';
  p.stdout.on('data',b=>stdout+=b);p.stderr.on('data',b=>stderr+=b);p.on('error',reject);
  p.on('close',code=>resolve({code,stdout,stderr,data:stdout?JSON.parse(stdout):null}));p.stdin.end(JSON.stringify(request));
 });
}
test('official mod helper reads a real vault and refuses traversal through JSON stdin',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'atelier-mod-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 await fs.writeFile(path.join(root,'Home.md'),'# Home\nNative mod.','utf8');
 const listed=await invoke({root,action:'list'});assert.equal(listed.code,0,listed.stderr);assert.equal(listed.data.value.files[0].path,'Home.md');
 const forbidden=await invoke({root,action:'read',args:{path:'../secret.md'}});assert.equal(forbidden.code,1);assert.equal(forbidden.data.code,'FORBIDDEN');
 const unknown=await invoke({root,action:'execute',args:{command:'echo no'}});assert.equal(unknown.code,1);assert.match(unknown.data.message,/Unknown/);
});
test('official mod helper keeps a stale save from overwriting an external edit',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'atelier-mod-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const file=path.join(root,'Home.md');await fs.writeFile(file,'original','utf8');
 const read=await invoke({root,action:'read',args:{path:'Home.md'}});assert.equal(read.code,0,read.stderr);
 await fs.writeFile(file,'external','utf8');
 const saved=await invoke({root,action:'save',args:{path:'Home.md',content:'stale',version:read.data.value.version}});
 assert.equal(saved.code,1);assert.equal(saved.data.code,'CONFLICT');assert.equal(await fs.readFile(file,'utf8'),'external');
});
test('UTF-8 split across input chunks is preserved exactly in a captured note',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'atelier-mod-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const request=Buffer.from(JSON.stringify({root,action:'create',args:{path:'Unicode.md',content:'Café 🌍 — Écrire'}}),'utf8');
 const cut=request.indexOf(Buffer.from('é'))+1;
 const response=await new Promise((resolve,reject)=>{
  const child=spawn(process.execPath,[helper],{windowsHide:true,stdio:['pipe','pipe','pipe']});let output='';
  child.stdout.setEncoding('utf8');child.stdout.on('data',chunk=>output+=chunk);child.on('error',reject);
  child.on('close',code=>resolve({code,output}));
  child.stdin.write(request.subarray(0,cut));setTimeout(()=>child.stdin.end(request.subarray(cut)),180);
 });
 assert.equal(response.code,0,response.output);
 assert.equal(await fs.readFile(path.join(root,'Unicode.md'),'utf8'),'Café 🌍 — Écrire');
});

test('the native helper and Desktop service share vault registrations through one catalog',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'atelier-shared-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));const notes=path.join(root,'Notes');await fs.mkdir(notes);await fs.writeFile(path.join(notes,'Home.md'),'# Shared vault','utf8');const catalogFile=path.join(root,'vaults.json');
 const desktop=createCatalogService({catalogFile});const registered=await desktop({action:'catalog.add',args:{path:notes,name:'Shared'}});
 const listed=await invoke({catalogFile,action:'catalog.list'});assert.equal(listed.code,0,listed.stderr);assert.equal(listed.data.value.activeId,registered.activeId);
 const read=await invoke({catalogFile,vaultId:registered.activeId,action:'read',args:{path:'Home.md'}});assert.equal(read.data.value.content,'# Shared vault');
 await invoke({catalogFile,vaultId:registered.activeId,action:'catalog.rename',args:{name:'Renamed in native pane'}});assert.equal((await desktop({action:'catalog.list'})).vaults[0].name,'Renamed in native pane');
});
