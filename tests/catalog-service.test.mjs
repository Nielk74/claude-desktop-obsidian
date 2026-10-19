import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createCatalogService,isTrustedDesktopFrame} from '../src/catalog-service.mjs';

test('Desktop IPC accepts only the top-level local app renderer',()=>{
 assert.equal(isTrustedDesktopFrame('app://localhost/new',true),true);
 for(const url of ['https://claude.ai/new','app://evil.test/new','file:///tmp/page.html','http://localhost/new','app://localhost.evil/new'])assert.equal(isTrustedDesktopFrame(url,true),false);
 assert.equal(isTrustedDesktopFrame('app://localhost/new',false),false);
});
test('vault requests use a registered ID and cannot substitute another root or escape it',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'atelier-service-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const vault=path.join(root,'Notes');await fs.mkdir(vault);await fs.writeFile(path.join(vault,'Home.md'),'# Registered note','utf8');
 const request=createCatalogService({catalogFile:path.join(root,'catalog.json')});const s=await request({action:'catalog.add',args:{path:vault,name:'Notes'}});
 const result=await request({action:'vault.read',vaultId:s.activeId,args:{path:'Home.md'},root:path.dirname(vault)});assert.equal(result.content,'# Registered note');
 await assert.rejects(request({action:'vault.read',vaultId:'unknown',args:{path:'Home.md'}}),/vault/i);
 await assert.rejects(request({action:'vault.read',vaultId:s.activeId,args:{path:'../outside.md'}}));
 await assert.rejects(request({action:'shell.run',args:{command:'bad'}}),/action/i);
});
