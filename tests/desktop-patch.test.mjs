import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import {readAsar,repackAsar,updateEmbeddedHash,injectWorkspace,injectNativeSettings,nativeSettingsFile,applyStaged,restoreStaged,checkUpdateBase} from '../src/desktop/patch.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
test('updates accept only the exact previous patch at the same installation',()=>{
 const installDir=path.resolve('fixture-app'),current={'claude.exe':Buffer.from('exe'),'resources/app.asar':Buffer.from('asar'),'resources/ion-dist/index.html':Buffer.from('html')};
 const manifest={version:1,installDir,files:Object.entries(current).map(([relative,bytes])=>({relative,patchedHash:hash(bytes)}))};
 assert.doesNotThrow(()=>checkUpdateBase(manifest,installDir,current));
 assert.throws(()=>checkUpdateBase(manifest,installDir,{...current,'resources/app.asar':Buffer.from('external update')}),/changed/i);
 assert.throws(()=>checkUpdateBase(manifest,path.resolve('other-app'),current),/installation/i);
 assert.throws(()=>checkUpdateBase({...manifest,files:manifest.files.slice(1)},installDir,current),/manifest/i);
 const extended={...current,[nativeSettingsFile]:Buffer.from('settings')},nextManifest={...manifest,files:Object.entries(extended).map(([relative,bytes])=>({relative,patchedHash:hash(bytes)}))};
 assert.doesNotThrow(()=>checkUpdateBase(nextManifest,installDir,extended));
 assert.throws(()=>checkUpdateBase(nextManifest,installDir,{...extended,[nativeSettingsFile]:Buffer.from('external edit')}),/changed/i);
});

test('the official General component renders an Obsidian section using Claude native settings components',()=>{
 const source='function P(){return a(ne,{children:[o(F,{}),e&&!t&&a(r,{children:[o(z,{}),o(U,{})]})]})}var Ft={};';
 const patched=injectNativeSettings(source),jsx=(type,props)=>({type,props});
 const result=vm.runInNewContext(patched+'P();',{a:jsx,o:jsx,ne:'Panel',h:'Section',F:'Appearance',e:true,t:false,r:'Fragment',z:'Voice',U:'Notifications'});
 assert.equal(result.props.children[0].type,'Appearance');const section=result.props.children.at(-1);
 assert.equal(section.type,'Section');assert.equal(section.props.title,'Obsidian');assert.equal(section.props.children.props['data-atelier-settings-slot'],'obsidian-controls');
 assert.equal(injectNativeSettings(patched),patched);assert.throws(()=>injectNativeSettings('unknown settings version'),/anchor/i);assert.throws(()=>injectNativeSettings(source+source),/anchor/i);
});
function archive(){const body=Buffer.from('original source');const raw=Buffer.from(JSON.stringify({files:{'entry.js':{size:body.length,offset:'0',integrity:{algorithm:'SHA256',hash:hash(body),blockSize:4194304,blocks:[hash(body)]}},native:{files:{'lib.node':{size:4,unpacked:true}}}}}));const length=8+raw.length+((4-raw.length%4)%4),h=Buffer.alloc(length),outer=Buffer.alloc(8);h.writeUInt32LE(length-4,0);h.writeUInt32LE(raw.length,4);raw.copy(h,8);outer.writeUInt32LE(4,0);outer.writeUInt32LE(length,4);return Buffer.concat([outer,h,body]);}
test('archive patch preserves unrelated and unpacked entries and recalculates changed file hashes',()=>{
 const a=archive(),patched=repackAsar(a,{'new/bridge.cjs':Buffer.from('bridge'),'entry.js':Buffer.from('changed source')});
 const result=readAsar(patched);assert.equal(result.read('entry.js').toString(),'changed source');assert.equal(result.read('new/bridge.cjs').toString(),'bridge');assert.equal(result.header.files.native.files['lib.node'].unpacked,true);assert.equal(result.header.files['entry.js'].integrity.hash,hash(Buffer.from('changed source')));
 assert.equal(readAsar(repackAsar(patched,{})).read('entry.js').toString(),'changed source');
});
test('embedded integrity update replaces exactly one hash and leaves other executable bytes intact',()=>{
 const old='a'.repeat(64),next='b'.repeat(64),exe=Buffer.from('prefix'+old+'suffix');const patched=updateEmbeddedHash(exe,old,next);assert.equal(patched.toString(),'prefix'+next+'suffix');assert.equal(exe.toString(),'prefix'+old+'suffix');
 assert.throws(()=>updateEmbeddedHash(Buffer.from(old+old),old,next),/exactly one/i);assert.throws(()=>updateEmbeddedHash(Buffer.from('none'),old,next),/exactly one/i);
});
test('workspace injection is idempotent and safely contains inline script delimiters',()=>{
 const html='<html><body><div id="root"></div></body></html>';const args={script:'const s="</script>";',style:':host{display:block}'};const once=injectWorkspace(html,args);
 assert.equal(injectWorkspace(once,args),once);assert.equal(once.match(/data-atelier-workspace/g).length,1);assert.ok(once.includes('<\\/script>'));assert.throws(()=>injectWorkspace('no body',args),/body/i);
});
test('staged installation and exact restore refuse unrelated application changes',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'atelier-patch-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));const installDir=path.join(root,'app-2.42304.2'),stageDir=path.join(root,'stage');await fs.mkdir(stageDir,{recursive:true});
 const files=[];for(const relative of ['claude.exe','resources/app.asar','resources/ion-dist/index.html',nativeSettingsFile]){
  const target=path.join(installDir,relative),backup=path.join(stageDir,relative+'.original'),staged=path.join(stageDir,relative+'.patched');await fs.mkdir(path.dirname(target),{recursive:true});await fs.mkdir(path.dirname(backup),{recursive:true});await fs.writeFile(target,'original');await fs.writeFile(backup,'original');await fs.writeFile(staged,'patched');files.push({relative,backup,staged,originalHash:hash('original'),patchedHash:hash('patched')});
 }
 const manifest={installDir,files};await applyStaged(manifest,{isRunning:async()=>false});assert.equal(await fs.readFile(path.join(installDir,'claude.exe'),'utf8'),'patched');
 await fs.writeFile(path.join(installDir,'claude.exe'),'external edit');await assert.rejects(restoreStaged(manifest,{isRunning:async()=>false}),/changed/i);assert.equal(await fs.readFile(path.join(installDir,'claude.exe'),'utf8'),'external edit');
 await fs.writeFile(path.join(installDir,'claude.exe'),'patched');await restoreStaged(manifest,{isRunning:async()=>false});assert.equal(await fs.readFile(path.join(installDir,'resources/app.asar'),'utf8'),'original');
 assert.equal(await fs.readFile(path.join(installDir,nativeSettingsFile),'utf8'),'original');
 await assert.rejects(applyStaged(manifest,{isRunning:async()=>true}),/quit|closed/i);
});

test('application changes during the process check are preserved',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'atelier-patch-race-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));const installDir=path.join(root,'app'),files=[];
 for(const relative of ['claude.exe','resources/app.asar','resources/ion-dist/index.html']){const target=path.join(installDir,relative),backup=path.join(root,relative+'.original'),staged=path.join(root,relative+'.patched');await fs.mkdir(path.dirname(target),{recursive:true});await fs.mkdir(path.dirname(backup),{recursive:true});await fs.writeFile(target,'original');await fs.writeFile(backup,'original');await fs.writeFile(staged,'patched');files.push({relative,backup,staged,originalHash:hash('original'),patchedHash:hash('patched')});}
 const target=path.join(installDir,'resources/app.asar');await assert.rejects(applyStaged({installDir,files},{isRunning:async()=>{await fs.writeFile(target,'external change');return false;}}),/changed/i);assert.equal(await fs.readFile(target,'utf8'),'external change');assert.equal(await fs.readFile(path.join(installDir,'claude.exe'),'utf8'),'original');
});

test('simultaneous installer operations cannot interleave application replacement',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'atelier-installer-lock-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));const installDir=path.join(root,'app'),files=[];
 for(const relative of ['claude.exe','resources/app.asar','resources/ion-dist/index.html']){const target=path.join(installDir,relative),backup=path.join(root,relative+'.original'),staged=path.join(root,relative+'.patched');await fs.mkdir(path.dirname(target),{recursive:true});await fs.mkdir(path.dirname(backup),{recursive:true});await fs.writeFile(target,'original');await fs.writeFile(backup,'original');await fs.writeFile(staged,'patched');files.push({relative,backup,staged,originalHash:hash('original'),patchedHash:hash('patched')});}
 let release,started;const gate=new Promise(r=>release=r),waiting=new Promise(r=>started=r);const first=applyStaged({installDir,files},{isRunning:async()=>{started();await gate;return false;}});await waiting;
 await assert.rejects(applyStaged({installDir,files},{isRunning:async()=>false}),/operation.*progress/i);release();await first;assert.equal(await fs.readFile(path.join(installDir,'claude.exe'),'utf8'),'patched');
});
