// Prepares an entirely disposable Electron shell from installed Obsidian.
import fs from 'node:fs/promises';import path from 'node:path';import{fileURLToPath}from'node:url';
import{readAsar,repackAsar,updateEmbeddedHash}from'../src/desktop/patch.mjs';
const project=fileURLToPath(new URL('../',import.meta.url)),root=path.join(project,'.local/obsidian-scoped-prototype'),installed=path.join(process.env.LOCALAPPDATA,'Programs/Obsidian'),appDir=path.join(root,'app'),marker=path.join(root,'prototype.json');
try{const config=JSON.parse(await fs.readFile(marker,'utf8'));console.log(JSON.stringify({alreadyPrepared:true,...config}));process.exit(0);}catch(e){if(e.code!=='ENOENT')throw e;}
const original=await fs.readFile(path.join(installed,'resources/app.asar')),archive=readAsar(original),pkg=JSON.parse(archive.read('package.json').toString('utf8'));
if(pkg.version!=='1.14.4')throw new Error('This disposable experiment was inspected only for Obsidian 1.14.4.');
await fs.mkdir(root,{recursive:true});await fs.cp(installed,appDir,{recursive:true,errorOnExist:true,force:false});
const vault=path.join(root,'Scoped Demo');await fs.cp(path.join(project,'Atelier Demo Vault'),vault,{recursive:true,errorOnExist:true,force:false});await fs.mkdir(path.join(root,'host-profile'),{recursive:true});
const main=Buffer.from('require('+JSON.stringify(path.join(project,'scripts/prototypes/scoped-runtime-spike.cjs'))+');\n');
const changed=repackAsar(original,{'main.js':main}),exe=await fs.readFile(path.join(appDir,'Obsidian.exe'));
await fs.writeFile(path.join(appDir,'resources/app.asar'),changed);await fs.writeFile(path.join(appDir,'Obsidian.exe'),updateEmbeddedHash(exe,archive.headerHash,readAsar(changed).headerHash));
const config={root,installed,vault,exePath:path.join(appDir,'Obsidian.exe')};await fs.writeFile(marker,JSON.stringify(config,null,2)+'\n','utf8');console.log(JSON.stringify({prepared:true,...config}));
