import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createVault} from '../src/vault.mjs';

async function fixture(t) {
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'atelier-test-'));
 t.after(()=>fs.rm(root,{recursive:true,force:true}));
 await fs.mkdir(path.join(root,'Project'),{recursive:true});
 await fs.mkdir(path.join(root,'Other'),{recursive:true});
 await fs.mkdir(path.join(root,'.obsidian'),{recursive:true});
 await fs.writeFile(path.join(root,'Project','Notes.md'),'---\ntype: project\nstatus: Active\n---\n# Notes\nA canonical vault.\n');
 await fs.writeFile(path.join(root,'Other','Notes.md'),'# Other\nDifferent content.');
 await fs.writeFile(path.join(root,'Écrire.md'),'# Écrire\nComprendre une idée.');
 await fs.writeFile(path.join(root,'.obsidian','secret.json'),'private');
 await fs.writeFile(path.join(root,'.obsidian','secret.md'),'private note');
 return {root,vault:await createVault(root)};
}
test('listing preserves duplicate basenames and excludes settings',async t=>{
 const {vault}=await fixture(t);const files=await vault.list();
 assert.deepEqual(files.map(f=>f.path).sort(),['Other/Notes.md','Project/Notes.md','Écrire.md'].sort());
});
test('search matches actual content and normalizes accented filenames',async t=>{
 const {vault}=await fixture(t);
 assert.equal((await vault.search('canonical'))[0].path,'Project/Notes.md');
 assert.equal((await vault.search('ecrire'))[0].path,'Écrire.md');
 assert.deepEqual(await vault.search('missing word'),[]);
});
test('saving persists text and rejects a stale version without changing the file',async t=>{
 const {vault,root}=await fixture(t);const original=await vault.read('Project/Notes.md');
 const saved=await vault.save('Project/Notes.md','# Updated\n',original.version);
 assert.notEqual(saved.version,original.version);
 await assert.rejects(vault.save('Project/Notes.md','# Stale',original.version),e=>e.code==='CONFLICT');
 assert.equal(await fs.readFile(path.join(root,'Project','Notes.md'),'utf8'),'# Updated\n');
});
test('external modifications are detected before saving',async t=>{
 const {vault,root}=await fixture(t);const original=await vault.read('Project/Notes.md');
 await fs.writeFile(path.join(root,'Project','Notes.md'),'external edit');
 await assert.rejects(vault.save('Project/Notes.md','overwrite',original.version),e=>e.code==='CONFLICT');
 assert.equal(await fs.readFile(path.join(root,'Project','Notes.md'),'utf8'),'external edit');
});
test('create is exclusive and concurrent requests cannot overwrite one another',async t=>{
 const {vault}=await fixture(t);
 const result=await Promise.allSettled([vault.create('Project/New.md','one'),vault.create('Project/New.md','two')]);
 assert.equal(result.filter(r=>r.status==='fulfilled').length,1);
 assert.ok(['one','two'].includes((await vault.read('Project/New.md')).content));
});
test('traversal, absolute paths, settings access, and non-Markdown writes are refused',async t=>{
 const {vault}=await fixture(t);
 for(const name of ['../outside.md','Project/../../outside.md','C:\\outside.md','\\\\server\\file.md','.obsidian/secret.json','Project/..\\..\\outside.md']) {
  await assert.rejects(vault.read(name),e=>e.code==='FORBIDDEN');
 }
 await assert.rejects(vault.create('Project/code.js','x'),e=>e.code==='UNSUPPORTED');
});
test('symlink escape is refused and never listed',async t=>{
 const {vault,root}=await fixture(t);const outside=await fs.mkdtemp(path.join(os.tmpdir(),'atelier-outside-'));
 t.after(()=>fs.rm(outside,{recursive:true,force:true}));
 await fs.writeFile(path.join(outside,'outside.md'),'outside');
 try{await fs.symlink(outside,path.join(root,'escape'),process.platform==='win32'?'junction':'dir');}
 catch(e){if(e.code==='EPERM'){t.skip('OS does not allow creating a test junction');return;}throw e;}
 await assert.rejects(vault.read('escape/outside.md'),e=>e.code==='FORBIDDEN');
 await assert.rejects(vault.create('escape/new.md','x'),e=>e.code==='FORBIDDEN');
 assert.equal((await vault.list()).some(f=>f.path.startsWith('escape/')),false);
});
test('Canvas file cards resolve notes and preserve missing references as visible errors',async t=>{
 const {vault,root}=await fixture(t);
 await fs.writeFile(path.join(root,'Board.canvas'),JSON.stringify({nodes:[{id:'a',type:'file',file:'Project/Notes.md',x:0,y:0,width:300,height:200},{id:'b',type:'file',file:'Missing.md',x:400,y:0,width:300,height:200}],edges:[]}));
 const board=await vault.canvas('Board.canvas');
 assert.match(board.nodes[0].preview,/canonical/);
 assert.equal(board.nodes[1].missing,true);
});
test('Bases preview evaluates supported filters and rejects unsupported expressions explicitly',async t=>{
 const {vault,root}=await fixture(t);
 await fs.writeFile(path.join(root,'Projects.base'),'filters:\n  and:\n    - note.type == "project"\nviews:\n  - type: table\n    name: Active\n    order: [file.name, note.status]\n');
 const base=await vault.base('Projects.base');
 assert.ok(base.size>0,'Bases previews carry the file metadata needed by the view');
 assert.equal(base.views[0].rows.length,1);assert.equal(base.views[0].rows[0].path,'Project/Notes.md');
 await fs.writeFile(path.join(root,'Unsupported.base'),'filters: magic()\nviews: [{type: table, name: Test}]');
 await assert.rejects(vault.base('Unsupported.base'),e=>e.code==='UNSUPPORTED_FILTER');
});
test('visible symlinks cannot expose hidden settings or edit non-Markdown targets',async t=>{
 const {vault,root}=await fixture(t);
 try{await fs.symlink(path.join(root,'.obsidian'),path.join(root,'Settings'),process.platform==='win32'?'junction':'dir');}
 catch(e){if(e.code==='EPERM'){t.skip('OS does not allow a test junction');return;}throw e;}
 await assert.rejects(vault.read('Settings/secret.md'),e=>e.code==='FORBIDDEN');
 await assert.rejects(vault.create('Settings/Injected.md','x'),e=>e.code==='FORBIDDEN');
});
test('alternate separators and separate handles share one save queue',async t=>{
 const {vault,root}=await fixture(t);const second=await createVault(root);
 const original=await vault.read('Project/Notes.md');
 const result=await Promise.allSettled([
  vault.save('Project/Notes.md','first',original.version),
  second.save('Project\\Notes.md','second',original.version),
 ]);
 assert.equal(result.filter(r=>r.status==='fulfilled').length,1);
 assert.equal(result.find(r=>r.status==='rejected')?.reason.code,'CONFLICT');
});
