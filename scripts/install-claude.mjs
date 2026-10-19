import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {isDeepStrictEqual} from 'node:util';

export function mergeClaudeConfig(previous,entry) {
 if(!previous||typeof previous!=='object'||Array.isArray(previous))throw new Error('Claude configuration must be a JSON object.');
 if(previous.mcpServers&&(typeof previous.mcpServers!=='object'||Array.isArray(previous.mcpServers)))throw new Error('Existing mcpServers configuration is invalid.');
 const existing=previous.mcpServers?.['atelier-obsidian'];
 if(existing&&!isDeepStrictEqual(existing,entry))throw new Error('A different atelier-obsidian server already exists. Review it before replacing it.');
 return {...previous,mcpServers:{...previous.mcpServers,'atelier-obsidian':entry}};
}
export async function installClaude({configPath,projectDir,vaultPath,nodePath=process.execPath}) {
 const server=path.join(projectDir,'src','server.mjs');
 await Promise.all([fs.access(server),fs.access(path.join(projectDir,'dist','vault.html')),fs.access(vaultPath),fs.access(nodePath)]);
 const entry={command:nodePath,args:[server,'--vault',vaultPath]};
 let original=null;try{original=await fs.readFile(configPath,'utf8');}catch(e){if(e.code!=='ENOENT')throw e;}
 const previous=original?JSON.parse(original.replace(/^\uFEFF/,'')):{};
 const config=mergeClaudeConfig(previous,entry);
 if(isDeepStrictEqual(previous,config))return {changed:false,configPath};
 await fs.mkdir(path.dirname(configPath),{recursive:true});
 const backup=original!==null?configPath+'.atelier-backup-'+Date.now()+'.json':null;
 if(backup)await fs.writeFile(backup,original,{encoding:'utf8',flag:'wx'});
 const temporary=configPath+'.atelier-'+Date.now()+'.tmp';
 try {
  await fs.writeFile(temporary,JSON.stringify(config,null,2)+'\n',{encoding:'utf8',flag:'wx'});
  let latest=null;try{latest=await fs.readFile(configPath,'utf8');}catch(e){if(e.code!=='ENOENT')throw e;}
  if(latest!==original)throw new Error('Claude configuration changed during installation. No settings were replaced.');
  await fs.rename(temporary,configPath);
 }finally{await fs.unlink(temporary).catch(()=>{});}
 return {changed:true,configPath,backup};
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url) {
 const projectDir=fileURLToPath(new URL('..',import.meta.url));
 try{
  const result=await installClaude({projectDir,vaultPath:path.join(projectDir,'Atelier Demo Vault'),configPath:path.join(process.env.APPDATA,'Claude','claude_desktop_config.json')});
  console.log(JSON.stringify(result,null,2));console.log('No application processes were restarted. Start a new Claude session after reloading its MCP configuration.');
 }catch(e){console.error(e.message);process.exitCode=1;}
}
