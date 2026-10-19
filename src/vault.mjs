import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {parse as parseYaml} from 'yaml';

export class VaultError extends Error {
 constructor(code,message){super(message);this.code=code;}
}
const fail=(code,message)=>{throw new VaultError(code,message);};
const digest=b=>createHash('sha256').update(b).digest('hex');
const fold=s=>s.normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase();
const textExtensions=new Set(['.md','.canvas','.base','.txt','.svg']);
const imageTypes={'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif','.webp':'image/webp'};
const supported=new Set([...textExtensions,...Object.keys(imageTypes)]);
const MAX_BYTES=2*1024*1024;
const pending=new Map();
const metadata=s=>s.startsWith('---\n')||s.startsWith('---\r\n')?parseYaml(s.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1]??'',{maxAliasCount:50})??{}:{};
const body=s=>s.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/,'');

export async function createVault(directory) {
 const root=await fs.realpath(directory);
 if(!(await fs.stat(root)).isDirectory())fail('INVALID_VAULT','Choose an existing vault folder.');
 const inside=target=>{const rel=path.relative(root,target);return rel===''||(!rel.startsWith('..'+path.sep)&&rel!=='..'&&!path.isAbsolute(rel));};
 function lexical(name) {
  if(typeof name!=='string'||!name||name.includes('\0'))fail('FORBIDDEN','A relative vault path is required.');
  const parts=name.replace(/\\/g,'/').split('/');
  if(/^[a-z]:/i.test(name)||name.startsWith('/')||name.startsWith('\\')||parts.some(s=>s==='..'||s==='.'||s.startsWith('.')||!s))fail('FORBIDDEN','This path is outside the accessible vault files.');
  const target=path.resolve(root,...parts);
  if(!inside(target))fail('FORBIDDEN','Path leaves the vault.');
  if(!supported.has(path.extname(name).toLowerCase()))fail('UNSUPPORTED','This file format is not supported.');
  return target;
 }
 async function locate(name,creating=false) {
  const target=lexical(name);
  const parts=path.relative(root,target).split(path.sep);let cursor=root;
  for(let i=0;i<parts.length;i++) {
   cursor=path.join(cursor,parts[i]);
   let stat;try{stat=await fs.lstat(cursor);}catch(e){if(creating&&i===parts.length-1&&e.code==='ENOENT')break;throw e;}
   if(stat.isSymbolicLink())fail('FORBIDDEN','Links and junctions are not accessible through this panel.');
  }
  const real=await fs.realpath(creating?path.dirname(target):target);
  if(!inside(real))fail('FORBIDDEN','Symbolic links cannot leave the vault.');
  return creating?path.join(real,path.basename(target)):real;
 }
 async function bytes(name) {
  const target=await locate(name);const handle=await fs.open(target,'r');
  try {
   const stat=await handle.stat();
   if(!stat.isFile())fail('UNSUPPORTED','Choose a file, not a folder.');
   if(stat.size>MAX_BYTES)fail('TOO_LARGE','Files larger than 2 MB are not opened in this panel.');
   const data=await handle.readFile();
   if(data.length>MAX_BYTES)fail('TOO_LARGE','File grew beyond the panel size limit.');
   return data;
  } finally {await handle.close();}
 }
 async function read(name) {
  const data=await bytes(name);const ext=path.extname(name).toLowerCase();
  const common={path:name,name:path.posix.basename(name),version:digest(data),size:data.length,kind:ext.slice(1)};
  if(imageTypes[ext])return {...common,dataUrl:`data:${imageTypes[ext]};base64,${data.toString('base64')}`};
  let content;try{content=new TextDecoder('utf-8',{fatal:true}).decode(data);}catch{fail('ENCODING','This file is not UTF-8. Convert it before editing.');}
  return {...common,content};
 }
 async function list() {
  const result=[];
  async function walk(dir) {
   for(const e of await fs.readdir(dir,{withFileTypes:true})) {
    if(e.name.startsWith('.')||e.name==='node_modules'||e.isSymbolicLink())continue;
    const target=path.join(dir,e.name);
    if(e.isDirectory())await walk(target);
    else if(e.isFile()&&supported.has(path.extname(e.name).toLowerCase())) {
     const stat=await fs.stat(target);const file=path.relative(root,target).split(path.sep).join('/');
     result.push({path:file,name:e.name,folder:path.posix.dirname(file)==='.'?'':path.posix.dirname(file),kind:path.extname(file).slice(1).toLowerCase(),size:stat.size,modified:stat.mtime.toISOString()});
     if(result.length>10000)fail('TOO_MANY_FILES','This panel supports up to 10,000 vault files.');
    }
   }
  }
  await walk(root);return result.sort((a,b)=>a.path.localeCompare(b.path));
 }
 async function search(query) {
  const terms=fold(query.trim()).split(/\s+/).filter(Boolean);if(!terms.length)return [];
  const result=[];
  for(const file of await list()) {
   let content='';
   if(['md','txt'].includes(file.kind)&&file.size<=MAX_BYTES)content=body((await read(file.path)).content);
   const hay=fold(file.path+'\n'+content);
   if(!terms.every(t=>hay.includes(t)))continue;
   const index=fold(content).indexOf(terms[0]);
   result.push({...file,excerpt:content.slice(Math.max(0,index-50),Math.max(0,index-50)+180).replace(/\n/g,' '),score:terms.every(t=>fold(file.name).includes(t))?2:1});
  }
  return result.sort((a,b)=>b.score-a.score||a.path.localeCompare(b.path)).slice(0,100);
 }
 async function serial(name,operation,creating=false) {
  const canonical=await locate(name,creating);
  const key=process.platform==='win32'?canonical.toLowerCase():canonical;
  const previous=pending.get(key)??Promise.resolve();
  const task=previous.catch(()=>{}).then(operation);pending.set(key,task);
  try{return await task;}finally{if(pending.get(key)===task)pending.delete(key);}
 }
 function validateWrite(name,content) {
  lexical(name);
  if(path.extname(name).toLowerCase()!=='.md')fail('UNSUPPORTED','Only Markdown notes can be edited or created.');
  if(typeof content!=='string'||Buffer.byteLength(content)>MAX_BYTES)fail('TOO_LARGE','A note must contain at most 2 MB of UTF-8 text.');
 }
 async function save(name,content,version) {
  validateWrite(name,content);
  if(typeof version!=='string'||!version)fail('CONFLICT','Reopen the note before saving.');
  return serial(name,async()=>{
   const target=await locate(name);
   if(digest(await bytes(name))!==version)fail('CONFLICT','This note changed outside the editor. Copy your draft or reload before saving.');
   const temporary=path.join(path.dirname(target),`.atelier-${randomUUID()}.tmp`);
   try {
    await fs.writeFile(temporary,content,{encoding:'utf8',flag:'wx'});
    if(digest(await bytes(name))!==version)fail('CONFLICT','The note changed while saving. Your draft is still available.');
    await fs.rename(temporary,target);
   } finally {await fs.unlink(temporary).catch(()=>{});}
   return read(name);
  });
 }
 async function create(name,content) {
  validateWrite(name,content);
  return serial(name,async()=>{
   const target=await locate(name,true);
   try{await fs.writeFile(target,content,{encoding:'utf8',flag:'wx'});}
   catch(e){if(e.code==='EEXIST')fail('EXISTS','A note already exists at this path. Choose another name.');throw e;}
   return read(name);
  },true);
 }
 async function canvas(name) {
  if(!name.endsWith('.canvas'))fail('UNSUPPORTED','Choose a Canvas file.');
  const snapshot=await read(name);const data=JSON.parse(snapshot.content);
  if(!Array.isArray(data.nodes)||!Array.isArray(data.edges)||data.nodes.length>2000||data.edges.length>4000)fail('INVALID_CANVAS','Canvas has invalid or excessively large node/edge arrays.');
  for(const n of data.nodes) {
   if(!['text','file','link','group'].includes(n.type)||!['x','y','width','height'].every(k=>Number.isFinite(n[k]))||n.width<=0||n.height<=0)fail('INVALID_CANVAS','Canvas contains an invalid card.');
   if(n.type==='file') {
    try{const f=await read(n.file);n.preview=f.content?body(f.content).slice(0,1100):'';n.asset=f.dataUrl;if(n.file.endsWith('.svg'))n.svg=f.content;}
    catch{n.preview='File unavailable';n.missing=true;}
   }
  }
  return {...snapshot,...data};
 }
 function filterMatch(filter,row) {
  if(filter==null)return true;
  if(typeof filter==='object') {
   if(Array.isArray(filter.and))return filter.and.every(f=>filterMatch(f,row));
   if(Array.isArray(filter.or))return filter.or.some(f=>filterMatch(f,row));
   if(Array.isArray(filter.not))return !filter.not.some(f=>filterMatch(f,row));
   fail('UNSUPPORTED_FILTER','This Bases filter is not supported by the preview. Open it in Obsidian.');
  }
  const m=String(filter).match(/^(?:(note|file)\.)?([\w]+)\s*(==|!=)\s*(.+)$/);
  if(m) {
   let value;try{value=parseYaml(m[4]);}catch{fail('UNSUPPORTED_FILTER','Unsupported comparison value.');}
   const actual=m[1]==='file'?row.file[m[2]]:row.properties[m[2]];
   return m[3]==='=='?actual===value:actual!==value;
  }
  const fn=String(filter).match(/^file\.(inFolder|hasTag)\("([^"\n]*)"\)$/);
  if(fn)return fn[1]==='inFolder'?(row.path.startsWith(fn[2]+'/')||row.file.folder===fn[2]):(row.properties.tags??[]).includes(fn[2]);
  fail('UNSUPPORTED_FILTER',`Unsupported Bases expression: ${String(filter).slice(0,100)}. Open this view in Obsidian.`);
 }
 async function base(name) {
  if(!name.endsWith('.base'))fail('UNSUPPORTED','Choose a Bases file.');
  const snapshot=await read(name);const data=parseYaml(snapshot.content,{maxAliasCount:50});
  if(!Array.isArray(data?.views))fail('INVALID_BASE','This Bases document has no views.');
  const rows=[];
  for(const file of await list())if(file.kind==='md'&&file.size<=MAX_BYTES) {
   const properties=metadata((await read(file.path)).content);
   rows.push({path:file.path,properties,file:{name:file.name.replace(/\.md$/i,''),ext:'md',folder:file.folder,path:file.path}});
  }
  return {...snapshot,properties:data.properties??{},views:data.views.map(v=>{
   if(v.type!=='table')fail('UNSUPPORTED_FILTER','Only table Bases views can be previewed in this panel.');
   const order=v.order??['file.name'];
   if(order.some(c=>c.startsWith('formula.')))fail('UNSUPPORTED_FILTER','Bases formulas are not evaluated in this preview.');
   let items=rows.filter(r=>filterMatch(data.filters,r)&&filterMatch(v.filters,r));
   const value=(r,k)=>k.startsWith('file.')?r.file[k.slice(5)]:r.properties[k.replace(/^note\./,'')];
   for(const sort of [...(v.sort??[])].reverse())items.sort((a,b)=>String(value(a,sort.property)??'').localeCompare(String(value(b,sort.property)??''),undefined,{numeric:true})*(sort.direction==='DESC'?-1:1));
   items=items.slice(0,v.limit??1000);
   return {name:v.name,columns:order.map(k=>({key:k,label:data.properties?.[k]?.displayName??k.replace(/^(file|note)\./,'')})),rows:items.map(r=>({path:r.path,values:order.map(k=>value(r,k)??'')}))};
  })};
 }
 return {root,name:path.basename(root),list,search,read,save,create,canvas,base};
}
