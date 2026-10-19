import {build} from 'esbuild';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const mod=new URL('../mods/obsidian/',import.meta.url);
await fs.mkdir(new URL('bridge/',mod),{recursive:true});
await build({absWorkingDir:root,entryPoints:['src/mod-bridge.mjs'],bundle:true,platform:'node',format:'cjs',target:'node22',minify:true,legalComments:'none',outfile:fileURLToPath(new URL('bridge/vault.cjs',mod))});
const render=await fs.readFile(new URL('../src/render.mjs',import.meta.url),'utf8');
await fs.writeFile(new URL('hooks/vault-render.js',mod),render,'utf8');
await fs.writeFile(new URL('hooks/defaults.js',mod),`// Generated local defaults. Manage saved vaults from the pane or main Obsidian tab.\nexport const defaultVault = ${JSON.stringify(fileURLToPath(new URL('../Atelier Demo Vault',import.meta.url)))};\nexport const nodeExecutable = ${JSON.stringify(process.execPath)};\nexport const catalogFile = ${JSON.stringify(path.join(process.env.LOCALAPPDATA,'Claude-3p','atelier-obsidian','vaults.json'))};\n`,'utf8');
console.log('Built official Obsidian mod: mods/obsidian');
