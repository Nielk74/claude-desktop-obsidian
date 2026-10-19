import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {createVault} from '../src/vault.mjs';

export async function createPreview(root) {
 const vault=await createVault(root);const token=randomBytes(32).toString('hex');let context='';
 const actions={
  vault_list:async()=>({name:vault.name,files:await vault.list()}),
  vault_search:async a=>({files:await vault.search(a.query)}),
  vault_read:a=>vault.read(a.path),vault_save:a=>vault.save(a.path,a.content,a.version),
  vault_create:a=>vault.create(a.path,a.content),vault_canvas:a=>vault.canvas(a.path),vault_base:a=>vault.base(a.path),
  preview_context:async a=>{if(typeof a.text!=='string'||a.text.length>20000)throw new Error('Invalid context');context=a.text;return {staged:true};},
  preview_status:async()=>({context}),
 };
 const server=http.createServer(async(req,res)=>{
  const address=server.address();const origin=`http://127.0.0.1:${address.port}`;
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');
  const respond=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data));};
  if(req.headers.host!==`127.0.0.1:${address.port}`){respond(403,{message:'Invalid host'});return;}
  if(req.method==='GET'&&req.url==='/preview') {
   const html=await fs.readFile(fileURLToPath(new URL('../dist/vault.html',import.meta.url)),'utf8');
   res.setHeader('Content-Security-Policy',"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'");
   res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(html.replace('<head>',`<head><meta name="preview-token" content="${token}">`));return;
  }
  if(req.method!=='POST'||!req.url.startsWith('/api/')){respond(404,{message:'Not found'});return;}
  if(req.headers.authorization!==`Bearer ${token}`||(req.headers.origin&&req.headers.origin!==origin)){respond(403,{message:'Unauthorized preview request'});return;}
  if(!String(req.headers['content-type']).startsWith('application/json')){respond(415,{message:'JSON required'});return;}
  const action=actions[req.url.slice(5)];if(!action){respond(404,{message:'Unknown action'});return;}
  try{
   let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>3*1024*1024)throw new Error('Request too large');}
   respond(200,await action(JSON.parse(body)));
  }catch(e){respond(e.code==='CONFLICT'?409:400,{code:e.code??'ERROR',message:e.message});}
 });
 return server;
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url) {
 const i=process.argv.indexOf('--vault');const root=i>=0?process.argv[i+1]:fileURLToPath(new URL('../Atelier Demo Vault',import.meta.url));
 const server=await createPreview(root);const port=Number(process.env.ATELIER_PREVIEW_PORT??4317);
 server.listen(port,'127.0.0.1',()=>console.log(`Atelier preview: http://127.0.0.1:${server.address().port}/preview`));
}
