import {resolveNoteLink,canvasLayout} from './vault-render.js';

const xml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
export const plain=value=>String(value??'').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g,'');
export function noteMarkdown(content,current,files){
 return plain(content).replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/,'').replace(/!?\[\[([^\]\n]+)\]\]/g,(_,raw)=>{
  const link=resolveNoteLink(raw,current,files);
  const label=link.label.replace(/[\[\]]/g,'');
  const index=files.findIndex(file=>file.path===link.path);
  return link.missing||index<0?label+' (unresolved)':`[${label}](https://atelier.invalid/note?i=${index})`;
 });
}
export function pages(text,size=8500){
 const parts=[];
 while(text.length>size){let end=text.lastIndexOf('\n',size);if(end<size/2)end=size;parts.push(text.slice(0,end));text=text.slice(end);}
 parts.push(text);return parts;
}
export function canvasSvg(data,zoom=1){
 const bounds=canvasLayout(data.nodes);const w=bounds.width/zoom,h=bounds.height/zoom;
 const view=[bounds.x+(bounds.width-w)/2,bounds.y+(bounds.height-h)/2,w,h].join(' ');
 const color=n=>({'1':'#cf7c8b','2':'#d4a977','3':'#d1c57d','4':'#85bfa5','5':'#88bbd2','6':'#bc9ce3'}[n.color]??'#a795be');
 const byId=new Map(data.nodes.map(n=>[n.id,n]));
 let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="620" viewBox="${view}"><rect x="${bounds.x}" y="${bounds.y}" width="${bounds.width}" height="${bounds.height}" fill="#1d1b22"/>`;
 for(const edge of data.edges){const a=byId.get(edge.fromNode),b=byId.get(edge.toNode);if(!a||!b)continue;const x=a.x+a.width/2,y=a.y+a.height/2,u=b.x+b.width/2,v=b.y+b.height/2;svg+=`<path d="M${x} ${y} C${(x+u)/2} ${y},${(x+u)/2} ${v},${u} ${v}" stroke="#796d89" stroke-width="3" fill="none"/>`;}
 for(const n of [...data.nodes.filter(n=>n.type==='group'),...data.nodes.filter(n=>n.type!=='group')]){
  const group=n.type==='group';svg+=`<rect x="${n.x}" y="${n.y}" width="${n.width}" height="${n.height}" rx="12" fill="${group?'#201d28':'#2c2737'}" fill-opacity="${group?'.5':'1'}" stroke="${color(n)}" stroke-width="2"/>`;
  const words=String(n.file??n.label??n.text??n.url??'').split(/\s+/);const lines=[];let line='';const width=Math.max(12,Math.floor(n.width/10));
  for(const word of words){if((line+' '+word).length>width&&line){lines.push(line);line='';}line+=(line?' ':'')+word;}
  if(line)lines.push(line);const shown=lines.slice(0,Math.max(1,Math.floor((n.height-20)/23)));
  svg+=`<text x="${n.x+16}" y="${n.y+29}" font-family="Segoe UI,sans-serif" font-size="17" fill="#eee8f6">${shown.map((l,i)=>`<tspan x="${n.x+16}" dy="${i?23:0}">${xml(l)}</tspan>`).join('')}</text>`;
 }
 svg+='</svg>';if(svg.length>131072)throw new Error('This Canvas is too large for the native preview.');return svg;
}
export function baseMarkdown(view){
 const cell=v=>plain(Array.isArray(v)?v.join(', '):v).replace(/\|/g,'\\|').replace(/\r?\n/g,' ');
 return '| '+view.columns.map(c=>cell(c.label)).join(' | ')+' |\n| '+view.columns.map(()=>'---').join(' | ')+' |\n'+view.rows.map(row=>'| '+row.values.map(cell).join(' | ')+' |').join('\n');
}
