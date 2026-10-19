import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {randomBytes} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createRuntimePreferences} from '../src/desktop/runtime-preferences.mjs';

const project=fileURLToPath(new URL('../',import.meta.url)),fixtures=path.join(project,'.local/desktop-ui-fixtures'),token=randomBytes(24).toString('hex');
await fs.mkdir(fixtures,{recursive:true});const preferences=createRuntimePreferences(path.join(fixtures,'runtime-preferences.json'));
const script=await fs.readFile(path.join(project,'.local/desktop-ui/build/workspace.js'),'utf8');
const html=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Obsidian · Desktop navigation preview</title><style>body{margin:0;background:#141414;color:#eee;font:14px Segoe UI,system-ui}aside{position:fixed;inset:0 auto 0 0;width:280px;border-right:1px solid #303030;padding:48px 14px;box-sizing:border-box}aside>div{display:flex;background:#252525;border-radius:7px}button{background:transparent;border:0;color:#ddd;padding:8px 15px;cursor:pointer}aside p{padding:12px;color:#aaa}main{margin-left:280px;min-height:100vh;padding:90px 60px;box-sizing:border-box}h1{font-size:24px;font-weight:400}.composer{position:fixed;bottom:45px;left:360px;right:80px;background:#242424;border:1px solid #333;border-radius:14px;padding:20px;color:#aaa}</style></head><body><aside><div><button>Cowork</button><button>Code</button></div><p>+ New</p><p>Customize</p><p><button onclick="document.getElementById('preview-settings').hidden=false">Settings</button></p><p>Example project</p></aside><main><section id="preview-settings" hidden style="position:fixed;inset:24px 40px 24px 300px;z-index:1002;background:#202020;border:1px solid #444;border-radius:16px;padding:32px;box-sizing:border-box"><button style="float:right" onclick="this.parentElement.hidden=true">Close settings</button><h1>Settings</h1><h2>General</h2><h3>Appearance</h3><p>Theme &nbsp; System</p><section><h3>Obsidian</h3><div data-atelier-settings-slot="obsidian-controls"></div></section></section><h1>What would you like to work on?</h1><p>Navigation and settings fixture. Actual Obsidian runs inside Claude Desktop.</p><div class="composer">Describe a task or ask a question</div></main><script>window.atelierObsidian={request:async r=>(await fetch('/api',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer ${token}'},body:JSON.stringify(r)})).json()};</script><script>${script.replace(/<\/script/gi,'<\\/script')}</script></body></html>`;
const server=http.createServer(async(req,res)=>{
 const origin='http://127.0.0.1:'+server.address().port;res.setHeader('Cache-Control','no-store');res.setHeader('X-Frame-Options','DENY');res.setHeader('X-Content-Type-Options','nosniff');
 if(req.headers.host!=='127.0.0.1:'+server.address().port){res.writeHead(403);res.end();return;}
 if(req.method==='GET'&&req.url==='/'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(html);return;}
 if(req.method!=='POST'||req.url!=='/api'||req.headers.authorization!=='Bearer '+token||(req.headers.origin&&req.headers.origin!==origin)){res.writeHead(403);res.end();return;}
 try{
  const buffers=[];let count=0;for await(const chunk of req){count+=chunk.length;if(count>8192)throw new Error('Request too large');buffers.push(chunk);}const request=JSON.parse(Buffer.concat(buffers).toString('utf8'));let value;
  if(request.action==='runtime.preferences.get')value=await preferences.get();else if(request.action==='runtime.preferences.set')value=await preferences.set(request.args?.controls);else if(['runtime.prototype.show','runtime.prototype.hide'].includes(request.action))value={visible:request.action.endsWith('.show'),preview:true};else throw new Error('Unknown preview action');
  res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({ok:true,value}));
 }catch(error){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({ok:false,message:error.message}));}
});server.listen(4318,'127.0.0.1',()=>console.log('Desktop navigation/settings preview: http://127.0.0.1:4318'));
