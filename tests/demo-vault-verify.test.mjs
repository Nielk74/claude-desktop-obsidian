import test from 'node:test';
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

test('generated demo validation tolerates a user-captured note without frontmatter',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'atelier-verify-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 await fs.cp(path.resolve('Atelier Demo Vault'),root,{recursive:true});await fs.writeFile(path.join(root,'Extra captured response.md'),'# Captured response\n\nNo generated metadata.\n','utf8');
 const {stdout}=await promisify(execFile)(process.execPath,['scripts/verify-demo-vault.mjs','--vault',root],{cwd:process.cwd()});
 const report=JSON.parse(stdout);assert.equal(report.notes,58);assert.deepEqual(report.errors,[]);
});
