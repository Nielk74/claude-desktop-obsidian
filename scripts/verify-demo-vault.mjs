import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {notes as generatedNotes} from './vault-content.mjs';

const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const manifest=JSON.parse(await fs.readFile(path.join(project,'demo-vault.json'),'utf8'));
const vaultArgument=process.argv.indexOf('--vault');
const root=vaultArgument>=0?path.resolve(process.argv[vaultArgument+1]):manifest.path;
const files=[];
async function walk(dir) {
 for(const e of await fs.readdir(dir,{withFileTypes:true})) {
  const name=path.join(dir,e.name);
  if(e.isDirectory()) await walk(name); else files.push(path.relative(root,name).split(path.sep).join('/'));
 }
}
await walk(root);
const texts=new Map();
for(const f of files) texts.set(f,await fs.readFile(path.join(root,f),'utf8'));
const failures=[];
let wikilinks=0,edges=0,nodes=0,headings=0,blocks=0;
function check(test,message) {if(!test) failures.push(message);}
function resolveFile(target,source) {
 const raw=target.replace(/\\/g,'/');
 const exact=[raw,raw+'.md'];
 for(const f of exact) if(texts.has(f)) return f;
 const relative=path.posix.normalize(path.posix.join(path.posix.dirname(source),raw));
 for(const f of [relative,relative+'.md']) if(texts.has(f)) return f;
 if(!raw.includes('/')) {
  const matches=files.filter(f=>path.posix.basename(f)===raw||path.posix.basename(f)===raw+'.md');
  if(matches.length===1) return matches[0];
 }
 return null;
}
function checkTarget(raw,source) {
 const target=raw.split('|')[0];
 const split=target.indexOf('#');
 const filePart=split<0?target:target.slice(0,split);
 const anchor=split<0?null:target.slice(split+1);
 const resolved=filePart?resolveFile(filePart,source):source;
 check(!!resolved,`${source}: missing or ambiguous link ${raw}`);
 if(!resolved||!anchor) return;
 const content=texts.get(resolved);
 if(anchor.startsWith('^')) {
  blocks++;
  check(content.includes(anchor),`${source}: missing block ${raw}`);
 } else {
  headings++;
  const wanted=anchor.split('#').at(-1).trim();
  const found=[...content.matchAll(/^#{1,6}\s+(.+?)\s*#*$/gm)].map(m=>m[1].trim());
  check(found.includes(wanted),`${source}: missing heading ${raw}`);
 }
}
const expectedNotes=new Set(generatedNotes.map(n=>n.path));
const markdown=files.filter(f=>expectedNotes.has(f));
for(const f of markdown) {
 const content=texts.get(f);
 check(content.startsWith('---\n'),`${f}: missing frontmatter`);
 check(!content.includes('\uFFFD'),`${f}: replacement character in UTF-8 text`);
 for(const m of content.matchAll(/!?\[\[([^\]\n]+)\]\]/g)) {wikilinks++;checkTarget(m[1],f);}
}
const canvases=files.filter(f=>f.endsWith('.canvas'));
for(const f of canvases) {
 const b=JSON.parse(texts.get(f));
 check(Array.isArray(b.nodes)&&Array.isArray(b.edges),`${f}: missing node/edge arrays`);
 const ids=new Set();
 for(const n of b.nodes) {
  check(typeof n.id==='string'&&!ids.has(n.id),`${f}: duplicate or missing node ID`);ids.add(n.id);
  check(['text','file','link','group'].includes(n.type),`${f}: invalid node type`);
  for(const k of ['x','y','width','height'])check(Number.isInteger(n[k]),`${f}: ${n.id} has invalid ${k}`);
  check(n.width>0&&n.height>0,`${f}: ${n.id} has nonpositive dimensions`);
  if(n.color)check(/^(#[0-9a-fA-F]{6}|[1-6])$/.test(n.color),`${f}: invalid color`);
  if(n.type==='file')checkTarget(n.file+(n.subpath??''),f);
  if(n.type==='text') {
   check(typeof n.text==='string',`${f}: text missing`);
   for(const m of n.text.matchAll(/!?\[\[([^\]\n]+)\]\]/g)){wikilinks++;checkTarget(m[1],f);}
  }
  if(n.type==='link')check(/^https:\/\//.test(n.url),`${f}: invalid reference URL`);
 }
 const edgeIds=new Set();
 for(const e of b.edges) {
  check(!edgeIds.has(e.id),`${f}: duplicate edge ID`);edgeIds.add(e.id);
  check(ids.has(e.fromNode)&&ids.has(e.toNode),`${f}: dangling edge ${e.id}`);
  for(const k of ['fromSide','toSide'])if(e[k])check(['top','right','bottom','left'].includes(e[k]),`${f}: invalid ${k}`);
 }
 nodes+=b.nodes.length;edges+=b.edges.length;
}
const bases=files.filter(f=>f.endsWith('.base'));
const properties=new Map(markdown.map(f=>{
 const fm=texts.get(f).split('---\n')[1];
 const data={};
 for(const line of fm.split('\n')) {
  const m=line.match(/^([\w-]+):\s*(.*)$/);
  if(m)try{data[m[1]]=JSON.parse(m[2]);}catch{failures.push(`${f}: invalid generated property ${m[1]}`);}
 }
 return [f,data];
}));
const baseRows={};
for(const f of bases) {
 const b=JSON.parse(texts.get(f));
 check(Array.isArray(b.views)&&b.views.length>0,`${f}: no views`);
 for(const v of b.views)check(v.type==='table'&&Array.isArray(v.order),`${f}: invalid table view`);
 const filter=b.filters.and.find(s=>s.startsWith('note.type =='));
 const type=JSON.parse(filter.split('==')[1].trim());
 baseRows[f]=[...properties.values()].filter(p=>p.type===type).length;
 check(baseRows[f]>0,`${f}: filters match no fixture notes`);
}
for(const f of files.filter(f=>f.startsWith('.obsidian/')&&f.endsWith('.json'))) JSON.parse(texts.get(f));
const bookmarks=JSON.parse(texts.get('.obsidian/bookmarks.json'));
for(const item of bookmarks.items)check(texts.has(item.path),'Missing bookmarked file '+item.path);
const svg=files.filter(f=>f.endsWith('.svg'));
for(const f of svg)check(texts.get(f).startsWith('<svg ')&&texts.get(f).includes('</svg>'),`${f}: malformed image fixture`);
for(const [f,p] of properties) {
 for(const key of ['created','updated','date'])if(p[key])check(p[key]<='2026-10-19',`${f}: sample activity extends into the future`);
}
check(markdown.length===manifest.notes,'Note count differs from manifest');
check(canvases.length===manifest.canvases,'Canvas count differs from manifest');
check(bases.length===manifest.bases,'Base count differs from manifest');
const report={vault:root,notes:markdown.length,canvases:canvases.length,canvasNodes:nodes,canvasEdges:edges,bases:baseRows,attachments:files.filter(f=>f.startsWith('09 Attachments/')).length,wikilinks,headingReferences:headings,blockReferences:blocks,errors:failures};
console.log(JSON.stringify(report,null,2));
assert.equal(failures.length,0,'Vault validation failed');
