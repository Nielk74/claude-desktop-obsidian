import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';

export const sha256=value=>createHash('sha256').update(value).digest('hex');
const parts=name=>{const p=name.split('/');if(!name||p.some(v=>!v||v==='.'||v==='..'||v==='__proto__'||v.includes('\\')))throw new Error('Invalid archive path');return p;};
function nodeFor(header,name,create=false){let node=header;const p=parts(name);for(const segment of p.slice(0,-1)){if(!Object.hasOwn(node.files??{},segment)){if(!create)return null;node.files??={};node.files[segment]={files:{}};}node=node.files[segment];if(!node.files)throw new Error('Archive path collides with a file');}if(create){node.files??={};node.files[p.at(-1)]??={};}return node.files?.[p.at(-1)]??null;}
export function readAsar(bytes){
 const size=bytes.readUInt32LE(4),length=bytes.readUInt32LE(12);if(size<8||length>size-8||8+size>bytes.length)throw new Error('Invalid ASAR header');
 const headerString=bytes.subarray(16,16+length),header=JSON.parse(headerString.toString('utf8')),base=8+size;
 return {header,headerHash:sha256(headerString),read(name){const entry=nodeFor(header,name);if(!entry||entry.files||entry.unpacked||entry.link)throw new Error('ASAR entry is not a packed file: '+name);const start=base+Number(entry.offset);if(!Number.isSafeInteger(start)||start<base||start+entry.size>bytes.length)throw new Error('Invalid ASAR file bounds');return bytes.subarray(start,start+entry.size);}};
}
export function repackAsar(bytes,changes){
 const original=readAsar(bytes),header=structuredClone(original.header);
 for(const[name,value]of Object.entries(changes)){
  const entry=nodeFor(header,name,true);if(entry.files||entry.unpacked||entry.link)throw new Error('Cannot replace a non-packed ASAR entry');
  const buffer=Buffer.from(value),blockSize=entry.integrity?.blockSize??4194304,blocks=[];for(let i=0;i<buffer.length;i+=blockSize)blocks.push(sha256(buffer.subarray(i,i+blockSize)));if(!buffer.length)blocks.push(sha256(buffer));
  Object.assign(entry,{size:buffer.length,integrity:{algorithm:'SHA256',hash:sha256(buffer),blockSize,blocks}});
 }
 const body=[];let offset=0;
 function collect(node,prefix=''){for(const[name,entry]of Object.entries(node.files??{})){const file=prefix+name;if(entry.files)collect(entry,file+'/');else if(!entry.unpacked&&!entry.link){const value=Object.hasOwn(changes,file)?Buffer.from(changes[file]):original.read(file);entry.offset=String(offset);entry.size=value.length;body.push(value);offset+=value.length;}}}
 collect(header);const raw=Buffer.from(JSON.stringify(header),'utf8'),length=8+raw.length+(4-raw.length%4)%4,pickle=Buffer.alloc(length),outer=Buffer.alloc(8);pickle.writeUInt32LE(length-4,0);pickle.writeUInt32LE(raw.length,4);raw.copy(pickle,8);outer.writeUInt32LE(4,0);outer.writeUInt32LE(length,4);return Buffer.concat([outer,pickle,...body]);
}
export function updateEmbeddedHash(exe,oldHash,nextHash){
 if(!/^[a-f0-9]{64}$/.test(oldHash)||!/^[a-f0-9]{64}$/.test(nextHash))throw new Error('Invalid integrity hash');
 const index=exe.indexOf(oldHash);if(index<0||exe.indexOf(oldHash,index+1)>=0)throw new Error('Expected exactly one embedded ASAR integrity hash');const output=Buffer.from(exe);output.write(nextHash,index,'ascii');return output;
}
const start='<!--atelier-obsidian:start-->',end='<!--atelier-obsidian:end-->';
export function injectWorkspace(html,{script,style}){
 const existing=html.indexOf(start);if(existing>=0){const finish=html.indexOf(end,existing);if(finish<0)throw new Error('Incomplete existing workspace patch');html=html.slice(0,existing)+html.slice(finish+end.length);}
 if(!html.includes('</body>'))throw new Error('Desktop HTML body anchor is missing');
 const injection=start+'<style id="atelier-workspace-style">'+style.replace(/<\/style/gi,'<\\/style')+'</style><script data-atelier-workspace>'+script.replace(/<\/script/gi,'<\\/script')+'</script>'+end;
 return html.replace('</body>',()=>injection+'</body>');
}
export const nativeSettingsFile='resources/ion-dist/assets/v1/c0db37792-CLeAbLs5.js';
export function injectNativeSettings(source){
 const section='o(h,{title:"Obsidian",children:o("div",{"data-atelier-settings-slot":"obsidian-controls"})})';
 if(source.includes(section)){if(source.split(section).length!==2)throw new Error('Native settings anchor is duplicated.');return source;}
 const anchor='e&&!t&&a(r,{children:[o(z,{}),o(U,{})]})]})}var Ft=';
 if(source.split(anchor).length!==2||source.includes('data-atelier-settings-slot'))throw new Error('The official General settings anchor is missing or ambiguous.');
 return source.replace(anchor,'e&&!t&&a(r,{children:[o(z,{}),o(U,{})]}),'+section+']})}var Ft=');
}
const coreTargets=['claude.exe','resources/app.asar','resources/ion-dist/index.html'],allowed=new Set([...coreTargets,nativeSettingsFile]);
const validFiles=files=>Array.isArray(files)&&[3,4].includes(files.length)&&new Set(files.map(f=>f.relative)).size===files.length&&coreTargets.every(relative=>files.some(file=>file.relative===relative))&&files.every(file=>allowed.has(file.relative));
async function inspect(manifest,restore){
 if(!path.isAbsolute(manifest.installDir)||!validFiles(manifest.files))throw new Error('Invalid Desktop patch manifest');
 const changes=[];
 for(const file of manifest.files){
  if(!allowed.has(file.relative))throw new Error('Unexpected Desktop patch target');const target=path.join(manifest.installDir,...file.relative.split('/'));
  const stat=await fs.lstat(target);if(!stat.isFile()||stat.isSymbolicLink())throw new Error('Desktop patch target is not a regular file');
  const current=sha256(await fs.readFile(target));if(current!==file.originalHash&&current!==file.patchedHash)throw new Error('Desktop file changed since staging: '+file.relative);
  const source=restore?file.backup:file.staged,expected=restore?file.originalHash:file.patchedHash;if(sha256(await fs.readFile(source))!==expected)throw new Error('Staged file or backup changed: '+file.relative);
  if(sha256(await fs.readFile(file.backup))!==file.originalHash)throw new Error('Original backup changed: '+file.relative);
  if(current!==expected)changes.push({...file,target,source,currentHash:current,expectedHash:expected});
 }
 return changes;
}
async function atomicCopy(source,target,beforeHash,afterHash){const temporary=target+'.atelier-'+randomUUID()+'.tmp';try{await fs.copyFile(source,temporary);if(sha256(await fs.readFile(temporary))!==afterHash)throw new Error('Staged source changed before replacement.');if(sha256(await fs.readFile(target))!==beforeHash)throw new Error('Desktop file changed before replacement.');await fs.rename(temporary,target);}finally{await fs.unlink(temporary).catch(()=>{});}}
async function changeInstallation(manifest,restore,{isRunning}){
 if(!(await inspect(manifest,restore)).length)return {changed:false};
 const lockFile=path.join(manifest.installDir,'.atelier-desktop-patch.lock');let lock;
 try{lock=await fs.open(lockFile,'wx');}catch(error){if(error.code==='EEXIST')throw new Error('Another Desktop patch operation is in progress.');throw error;}
 try{
  if(typeof isRunning!=='function'||await isRunning(manifest.installDir))throw new Error('Fully quit Claude Desktop, including its tray icon, before applying this patch.');
  const changes=await inspect(manifest,restore),completed=[];
  try{for(const file of changes){await atomicCopy(file.source,file.target,file.currentHash,file.expectedHash);completed.push(file);}}
  catch(error){const failures=[];for(const file of completed.reverse())try{await atomicCopy(restore?file.staged:file.backup,file.target,file.expectedHash,file.currentHash);}catch(failure){failures.push(failure);}if(failures.length)throw new AggregateError([error,...failures],'Desktop patch stopped; a file changed during rollback. Exact backups are preserved.');throw error;}
  for(const file of changes)if(sha256(await fs.readFile(file.target))!==file.expectedHash)throw new Error('Desktop write verification failed: '+file.relative);
  return {changed:true,files:changes.length};
 }finally{await lock.close();await fs.unlink(lockFile);}
}
export function checkUpdateBase(manifest,installDir,current){
 if(manifest?.version!==1||!validFiles(manifest.files))throw new Error('Invalid previous patch manifest.');
 if(path.resolve(manifest.installDir).toLowerCase()!==path.resolve(installDir).toLowerCase())throw new Error('Previous patch belongs to a different installation.');
 for(const {relative}of manifest.files){
  const file=manifest.files.find(file=>file.relative===relative);if(!file||!Buffer.isBuffer(current[relative]))throw new Error('Invalid previous patch manifest.');
  if(sha256(current[relative])!==file.patchedHash)throw new Error('Installed Desktop changed since the previous patch: '+relative);
 }
}
export const applyStaged=(manifest,options={})=>changeInstallation(manifest,false,options);
export const restoreStaged=(manifest,options={})=>changeInstallation(manifest,true,options);
