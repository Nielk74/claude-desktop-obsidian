import {build} from 'esbuild';
import fs from 'node:fs/promises';
const output=await build({entryPoints:['src/view.mjs'],bundle:true,write:false,format:'iife',target:'es2022',minify:true,legalComments:'none'});
const [template,css]=await Promise.all([fs.readFile('src/view.html','utf8'),fs.readFile('src/view.css','utf8')]);
const html=template.replace('<!--CSS-->',()=>`<style>${css}</style>`).replace('<!--JS-->',()=>`<script>${output.outputFiles[0].text.replace(/<\/script/gi,'<\\/script')}</script>`);
await fs.mkdir('dist',{recursive:true});await fs.writeFile('dist/vault.html',html,'utf8');
console.log(`Built self-contained MCP view: dist/vault.html (${Buffer.byteLength(html).toLocaleString()} bytes)`);
