import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createCatalog} from '../src/vault-catalog.mjs';

async function fixture(t){
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'atelier-catalog-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 const one=path.join(dir,'Personal'),two=path.join(dir,'Work');
 for(const root of [one,two]){await fs.mkdir(root);await fs.writeFile(path.join(root,'Home.md'),'# '+path.basename(root),'utf8');}
 return {dir,one,two,file:path.join(dir,'settings','vaults.json')};
}
test('multiple named vaults and the selected vault survive reopening the catalog',async t=>{
 const f=await fixture(t),c=createCatalog(f.file);await c.add(f.one,'Personal notes');const s=await c.add(f.two,'Work notes');
 const reopened=await createCatalog(f.file).read();assert.equal(reopened.vaults.length,2);assert.equal(reopened.activeId,s.activeId);assert.equal(reopened.vaults[0].name,'Personal notes');
});
test('canonical duplicate paths keep one entry and an invalid addition preserves the current vault',async t=>{
 const f=await fixture(t),c=createCatalog(f.file);const first=await c.add(f.one,'Notes');await c.add(path.join(f.one,'.'),'Duplicate');
 assert.equal((await c.read()).vaults.length,1);await assert.rejects(c.add(path.join(f.dir,'missing'),'Missing'));assert.equal((await c.read()).activeId,first.activeId);
});
test('independent catalog handles cannot lose simultaneous additions',async t=>{
 const f=await fixture(t);await Promise.all([createCatalog(f.file).add(f.one),createCatalog(f.file).add(f.two)]);assert.equal((await createCatalog(f.file).read()).vaults.length,2);
});
test('each vault remembers its own note and removing a registration leaves files intact',async t=>{
 const f=await fixture(t),c=createCatalog(f.file);const a=await c.add(f.one),id=a.activeId;const b=await c.add(f.two);
 await c.remember(id,'Home.md');await c.rename(id,'Private');await c.activate(id);
 const s=await c.read();assert.equal(s.vaults.find(v=>v.id===id).lastNote,'Home.md');assert.equal(s.vaults.find(v=>v.id===b.activeId).lastNote,null);
 const after=await c.remove(id);assert.equal(after.activeId,b.activeId);assert.equal(await fs.readFile(path.join(f.one,'Home.md'),'utf8'),'# Personal');
});
test('malformed persisted settings are reported without being overwritten',async t=>{
 const f=await fixture(t);await fs.mkdir(path.dirname(f.file));await fs.writeFile(f.file,'{broken','utf8');const c=createCatalog(f.file);
 await assert.rejects(c.read(),/catalog|settings/i);await assert.rejects(c.add(f.one));assert.equal(await fs.readFile(f.file,'utf8'),'{broken');
});
test('a default vault initializes once and removing the last entry keeps the empty setup state',async t=>{
 const f=await fixture(t),c=createCatalog(f.file,{defaultVault:f.one});const s=await c.read();assert.equal(s.vaults.length,1);
 await c.remove(s.activeId);assert.equal((await createCatalog(f.file,{defaultVault:f.one}).read()).vaults.length,0);
});
