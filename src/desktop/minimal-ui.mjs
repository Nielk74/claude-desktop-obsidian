import fs from 'node:fs/promises';
import path from 'node:path';

const start='/* atelier:claude-minimal:start */',end='/* atelier:claude-minimal:end */';
export async function applyDemoMinimalUi(project,vault,{restore=false}={}){
 const target=path.join(vault,'.obsidian','snippets','atelier.css');
 const previous=await fs.readFile(target,'utf8');
 const index=previous.indexOf(start);let base=previous;
 if(index>=0){const finish=previous.indexOf(end,index);if(finish<0)throw new Error('The existing minimal UI block is incomplete; preserve the snippet and repair it manually.');base=previous.slice(0,index)+previous.slice(finish+end.length);}
 const output=restore?base.trimEnd()+'\n':base.trimEnd()+'\n\n'+start+'\n'+await fs.readFile(path.join(project,'src','desktop','obsidian-minimal.css'),'utf8')+'\n'+end+'\n';
 if(output!==previous){
  await fs.writeFile(target+'.before-claude-minimal',previous,{encoding:'utf8',flag:'wx'}).catch(error=>{if(error.code!=='EEXIST')throw error;});
  await fs.writeFile(target,output,'utf8');
 }
 return{snippet:target,mode:restore?'full':'minimal',changed:output!==previous};
}
