import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

test('the actual Electron bridge refuses remote and child frames before dispatching a request',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'atelier-ipc-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));let handler,pickerCalls=0;
 const output=await build({entryPoints:['src/desktop/main.mjs'],bundle:true,write:false,platform:'node',format:'cjs',external:['electron'],define:{__ATELIER_CONFIG__:JSON.stringify({catalogFile:path.join(dir,'catalog.json')})}});
 const electron={ipcMain:{handle:(_name,callback)=>{handler=callback;}},dialog:{showOpenDialog:async()=>{pickerCalls++;return {canceled:true,filePaths:[]};}},BrowserWindow:{fromWebContents:()=>null}};
 const require=createRequire(import.meta.url);vm.runInNewContext(output.outputFiles[0].text,{require:name=>name==='electron'?electron:require(name),module:{exports:{}},exports:{},Buffer,process,console,setTimeout,clearTimeout,URL,TextDecoder,structuredClone});
 const mainFrame={url:'app://localhost/new'},sender={mainFrame};
 let answer=await handler({sender,senderFrame:mainFrame},{action:'catalog.list'});assert.equal(answer.ok,true);assert.equal(answer.value.vaults.length,0);
 answer=await handler({sender,senderFrame:{url:'https://evil.test'}},{action:'catalog.pick'});assert.equal(answer.ok,false);
 answer=await handler({sender,senderFrame:{url:'app://localhost/new'}},{action:'catalog.pick'});assert.equal(answer.ok,false);assert.equal(pickerCalls,0);
 answer=await handler({sender,senderFrame:mainFrame},{action:'catalog.pick'});assert.equal(answer.ok,true);assert.equal(answer.value,null);assert.equal(pickerCalls,1);
 answer=await handler({sender,senderFrame:{url:'https://evil.test'}},{action:'runtime.prototype.show'});assert.equal(answer.ok,false);
 answer=await handler({sender,senderFrame:{url:'app://localhost/new'}},{action:'runtime.prototype.show'});assert.equal(answer.ok,false);
 answer=await handler({sender,senderFrame:mainFrame},{action:'runtime.prototype.show'});assert.equal(answer.ok,false);assert.match(answer.message,/prototype.*configured/i);
});
