import {McpServer} from '@modelcontextprotocol/server';
import {registerAppResource,registerAppTool,RESOURCE_MIME_TYPE} from '@modelcontextprotocol/ext-apps/server';
import {z} from 'zod';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createVault} from './vault.mjs';

export const UI_URI='ui://atelier/vault.html';
export async function createServer(root) {
 const vault=await createVault(root);
 const server=new McpServer({name:'Atelier Obsidian Panel',version:'0.1.0'});
 const result=value=>({content:[{type:'text',text:JSON.stringify(value)}],structuredContent:value});
 const safe=fn=>async args=>{
  try{return result(await fn(args));}
  catch(e){const code=e.code??'ERROR';return {isError:true,content:[{type:'text',text:code==='ENOENT'?'This note or folder is unavailable.':e.message}],structuredContent:{code,message:code==='ENOENT'?'This note or folder is unavailable.':e.message}};}
 };
 registerAppTool(server,'open_obsidian_vault',{
  title:'Open Obsidian vault',description:'Open the interactive Atelier Obsidian vault panel. Browse/search notes, view Canvas boards and Bases tables, edit Markdown, and explicitly choose passages to use in this conversation. Obsidian does not need to be running.',
  inputSchema:z.object({}),annotations:{readOnlyHint:true},_meta:{ui:{resourceUri:UI_URI}},
 },safe(async()=>({name:vault.name,home:'Home.md',files:await vault.list()})));
 const appTool=(name,title,inputSchema,callback,readOnlyHint=true)=>registerAppTool(server,name,{title,inputSchema,annotations:{readOnlyHint},_meta:{ui:{resourceUri:UI_URI,visibility:['app']}}},safe(callback));
 appTool('vault_list','List vault files',z.object({}),()=>vault.list().then(files=>({name:vault.name,files})));
 appTool('vault_search','Search vault',z.object({query:z.string().max(200)}),async a=>({files:await vault.search(a.query)}));
 appTool('vault_read','Read vault file',z.object({path:z.string()}),a=>vault.read(a.path));
 appTool('vault_canvas','Read Canvas preview',z.object({path:z.string()}),a=>vault.canvas(a.path));
 appTool('vault_base','Read Bases preview',z.object({path:z.string()}),a=>vault.base(a.path));
 appTool('vault_save','Save edited note',z.object({path:z.string(),content:z.string(),version:z.string()}),a=>vault.save(a.path,a.content,a.version),false);
 appTool('vault_create','Create a new note',z.object({path:z.string(),content:z.string()}),a=>vault.create(a.path,a.content),false);
 registerAppResource(server,'Atelier vault panel',UI_URI,{mimeType:RESOURCE_MIME_TYPE},async()=>({contents:[{uri:UI_URI,mimeType:RESOURCE_MIME_TYPE,text:await fs.readFile(fileURLToPath(new URL('../dist/vault.html',import.meta.url)),'utf8'),_meta:{ui:{csp:{connectDomains:[],resourceDomains:[]},prefersBorder:true}}}]}));
 return server;
}
