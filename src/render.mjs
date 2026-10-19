export function resolveNoteLink(raw,current,files) {
 const [target,alias]=raw.split('|');const separator=target.indexOf('#');
 const name=(separator<0?target:target.slice(0,separator)).trim();
 const anchor=separator<0?'':target.slice(separator+1);
 const known=new Set(files.map(f=>f.path));
 let resolved=name?null:current;
 const folder=current.includes('/')?current.slice(0,current.lastIndexOf('/')+1):'';
 for(const candidate of [name,name+'.md',folder+name,folder+name+'.md'])if(!resolved&&known.has(candidate))resolved=candidate;
 if(!resolved&&!name.includes('/')) {
  const matches=files.filter(f=>f.path.split('/').at(-1)===name||f.path.split('/').at(-1)===name+'.md');
  if(matches.length===1)resolved=matches[0].path;
 }
 return {path:resolved??name,anchor,label:alias??(name.split('/').at(-1).replace(/\.md$/,'')||anchor),missing:!resolved};
}
export function canvasLayout(nodes) {
 if(!nodes.length)return {x:0,y:0,width:800,height:500};
 const minX=Math.min(...nodes.map(n=>n.x)),minY=Math.min(...nodes.map(n=>n.y));
 return {x:minX-40,y:minY-40,width:Math.max(...nodes.map(n=>n.x+n.width))-minX+80,height:Math.max(...nodes.map(n=>n.y+n.height))-minY+80};
}
export function sourceExcerpt(path,text) {
 if(text.length>20000)throw new Error('Choose a shorter passage (maximum 20,000 characters).');
 return `Source: ${path}\n\n${text.trim()}`;
}
export function prepareMarkdown(source) {
 let fence=null;
 return source.split('\n').map(line=>{
  const marker=line.match(/^\s*(`{3,}|~{3,})/);
  if(marker){const type=marker[1][0];fence=fence===type?null:(fence??type);return line;}
  if(fence||!/^\s*\|/.test(line))return line;
  return line.replace(/\[\[[^\]\n]+\]\]/g,link=>link.replace(/(?<!\\)\|/g,'\\|'));
 }).join('\n');
}
