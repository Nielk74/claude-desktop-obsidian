import test from 'node:test';
import assert from 'node:assert/strict';
import {Client} from '@modelcontextprotocol/client';
import {StdioClientTransport} from '@modelcontextprotocol/client/stdio';
import path from 'node:path';

test('real stdio server discovers the interactive resource and enforces app-only writes',async t=>{
 const transport=new StdioClientTransport({command:process.execPath,args:[path.resolve('src/server.mjs'),'--vault',path.resolve('Atelier Demo Vault')],stderr:'pipe'});
 const client=new Client({name:'Atelier test',version:'1.0.0'});
 t.after(()=>client.close());await client.connect(transport);
 const {tools}=await client.listTools();
 assert.equal(tools.find(t=>t.name==='open_obsidian_vault')._meta.ui.resourceUri,'ui://atelier/vault.html');
 assert.deepEqual(tools.find(t=>t.name==='vault_save')._meta.ui.visibility,['app']);
 const opened=await client.callTool({name:'open_obsidian_vault',arguments:{}});
 assert.equal(opened.structuredContent.name,'Atelier Demo Vault');
 const read=await client.callTool({name:'vault_read',arguments:{path:'Home.md'}});
 assert.match(read.structuredContent.content,/# Atelier/);
 const blocked=await client.callTool({name:'vault_read',arguments:{path:'../README.md'}});
 assert.equal(blocked.isError,true);assert.equal(blocked.structuredContent.code,'FORBIDDEN');
 const resource=await client.readResource({uri:'ui://atelier/vault.html'});
 assert.equal(resource.contents[0].mimeType,'text/html;profile=mcp-app');
 assert.match(resource.contents[0].text,/<html/);
});
