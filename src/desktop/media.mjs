import {Marked} from 'marked';
import DOMPurify from 'dompurify';
import {prepareMarkdown,resolveNoteLink} from '../render.mjs';

const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const imageFile=path=>/\.(png|jpe?g|gif|webp|svg)$/i.test(path);
function resolveImage(raw,current,files){
 let name;try{name=decodeURIComponent(raw.trim());}catch{return null;}
 if(/^[a-z][a-z\d+.-]*:/i.test(name)||name.startsWith('//')||name.includes('\\'))return null;
 name=name.split('#')[0];
 const normalize=value=>{const result=[];for(const part of value.split('/')){if(!part||part==='.')continue;if(part==='..'){if(!result.length)return null;result.pop();}else result.push(part);}return result.join('/');};
 const folder=current.includes('/')?current.slice(0,current.lastIndexOf('/')+1):'';
 const relative=normalize(folder+name),root=normalize(name);
 const candidates=name.startsWith('/')?[root]:[relative,root];
 for(const candidate of candidates)if(candidate&&files.some(file=>file.path===candidate)&&imageFile(candidate))return candidate;
 if(!name.includes('/')){const matches=files.filter(file=>file.path.split('/').at(-1)===name&&imageFile(file.path));if(matches.length===1)return matches[0].path;}
 return null;
}

export function renderNote(content,current,files){
 const embeds=[];
 const image=(raw,label,dimensions)=>{
  const path=resolveImage(raw,current,files);
  if(!path){const external=/^https?:\/\//i.test(raw);return `<span class="image-unavailable">${external?'External image · open in Obsidian':'Image unavailable'}: ${escape(label||raw)}</span>`;}
  const entry={path,label:label||path.split('/').at(-1)};
  const size=/^(\d{1,4})(?:x(\d{1,4}))?$/.exec(dimensions??'');
  if(size){entry.width=Math.min(2000,Math.max(16,Number(size[1])));if(size[2])entry.height=Math.min(2000,Math.max(16,Number(size[2])));}
  const index=embeds.push(entry)-1;
  return `<span class="image-embed" data-vault-image="${index}" role="status">Loading ${escape(entry.label)}…</span>`;
 };
 const md=new Marked({gfm:true,extensions:[{
  name:'wikilink',level:'inline',start:source=>source.search(/!?\[\[/),
  tokenizer(source){const match=/^(!?)\[\[([^\]\n]+)\]\]/.exec(source);if(match)return {type:'wikilink',raw:match[0],target:match[2].replace(/\\\|/g,'|'),embed:!!match[1]};},
  renderer(token){
   const [target,alias]=token.target.split('|');
   if(token.embed&&imageFile(target.split('#')[0]))return image(target,/^\d+(?:x\d+)?$/.test(alias??'')?target.split('/').at(-1):alias,alias);
   const link=resolveNoteLink(token.target,current,files),index=files.findIndex(file=>file.path===link.path);
   return link.missing||index<0?escape(link.label)+' (unresolved)':`<a href="https://atelier.invalid/note?i=${index}">${escape(link.label)}</a>`;
  }
 }],renderer:{image:token=>image(token.href,token.text)}});
 const body=content.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/,'');
 return {html:md.parse(prepareMarkdown(body)),embeds};
}

export function imageSource(data){
 if(typeof data.dataUrl==='string'&&/^data:image\/(png|jpeg|gif|webp);base64,[a-z\d+/=\r\n]+$/i.test(data.dataUrl))return data.dataUrl;
 if(data.kind==='svg'){
  const safe=DOMPurify.sanitize(data.content??'',{USE_PROFILES:{svg:true,svgFilters:true},FORBID_TAGS:['foreignObject','image','use','a','style','script','animate','animateTransform','set'],FORBID_ATTR:['href','xlink:href','src','style']});
  return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(safe);
 }
 return null;
}
