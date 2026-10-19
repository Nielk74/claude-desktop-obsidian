// Disposable feasibility spike; this is not the installed Claude integration.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readAsar,repackAsar,updateEmbeddedHash,sha256} from '../src/desktop/patch.mjs';

const project=fileURLToPath(new URL('../',import.meta.url));
const root=path.join(project,'.local','obsidian-native-prototype');
const installed=path.join(process.env.LOCALAPPDATA,'Programs','Obsidian');
const appDir=path.join(root,'app'),profile=path.join(root,'profile'),vault=path.join(root,'Atelier Native Demo');
const marker=path.join(root,'prototype.json');
try{
 const ready=JSON.parse(await fs.readFile(marker,'utf8'));
 if(process.argv.includes('--refresh-probe')){
  let probe;try{probe=JSON.parse(await fs.readFile(ready.probeFile,'utf8'));}catch{}
  if(probe?.pid){let running=false;try{process.kill(probe.pid,0);running=true;}catch(error){if(error.code!=='ESRCH')throw error;}if(running)throw new Error('Gracefully close the disposable runtime before refreshing its probe.');}
  const archiveFile=path.join(appDir,'resources','app.asar'),current=await fs.readFile(archiveFile),old=readAsar(current),probeCode=await fs.readFile(path.join(project,'scripts/prototypes/runtime-probe.cjs'));
  const changed=repackAsar(current,{'atelier-probe.cjs':probeCode});
  if(ready.embeddedHashUpdated)await fs.writeFile(ready.exePath,updateEmbeddedHash(await fs.readFile(ready.exePath),old.headerHash,readAsar(changed).headerHash));
  await fs.writeFile(archiveFile,changed);ready.launcherHash=sha256(changed);await fs.writeFile(marker,JSON.stringify(ready,null,2)+'\n','utf8');console.log(JSON.stringify({refreshed:true,root}));
 }else console.log(JSON.stringify({alreadyPrepared:true,...ready}));
 process.exit(0);
}catch(error){if(error.code!=='ENOENT')throw error;}
const originalLauncher=await fs.readFile(path.join(installed,'resources','app.asar'));
const originalRuntime=await fs.readFile(path.join(installed,'resources','obsidian.asar'));
const launcher=readAsar(originalLauncher),runtime=readAsar(originalRuntime);
const version=JSON.parse(launcher.read('package.json').toString('utf8')).version;
if(version!=='1.14.4')throw new Error('Prototype bootstrap was inspected only for installed Obsidian 1.14.4.');
await fs.mkdir(root,{recursive:true});
await fs.cp(installed,appDir,{recursive:true,errorOnExist:true,force:false});
await fs.cp(path.join(project,'Atelier Demo Vault'),vault,{recursive:true,errorOnExist:true,force:false});
await fs.mkdir(profile,{recursive:true});await fs.mkdir(path.join(profile,'session'),{recursive:true});await fs.mkdir(path.join(profile,'crashes'),{recursive:true});
const vaultId='a7e11e0000000001';
await fs.writeFile(path.join(profile,'obsidian.json'),JSON.stringify({vaults:{[vaultId]:{path:vault,ts:Date.now(),open:true}},updateDisabled:true,frame:'native'}),'utf8');
await fs.writeFile(path.join(profile,vaultId+'.json'),JSON.stringify({width:1100,height:800,isMaximized:false}),'utf8');
const probeFile=path.join(root,'probe.json'),visibleFile=path.join(root,'allow-visible');
const instrumentation=await fs.readFile(path.join(project,'scripts/prototypes/runtime-probe.cjs'));
const nextLauncher=repackAsar(originalLauncher,{'main.js':Buffer.concat([Buffer.from('require("./atelier-probe.cjs");\n'),launcher.read('main.js')]),'atelier-probe.cjs':Buffer.from(instrumentation)});
let main=runtime.read('main.js').toString('utf8');
if(!main.includes('obsidian-cli-'))throw new Error('Inspected CLI pipe name missing.');
main=main.replaceAll('obsidian-cli-','atelier-obsidian-native-prototype-cli-');
const nextRuntime=repackAsar(originalRuntime,{'main.js':Buffer.from(main)});
await fs.writeFile(path.join(appDir,'resources','app.asar'),nextLauncher);
await fs.writeFile(path.join(appDir,'resources','obsidian.asar'),nextRuntime);
const exePath=path.join(appDir,'Obsidian.exe'),exe=await fs.readFile(exePath),hashOccurrences=exe.toString('latin1').split(launcher.headerHash).length-1;
if(hashOccurrences===1)await fs.writeFile(exePath,updateEmbeddedHash(exe,launcher.headerHash,readAsar(nextLauncher).headerHash));
else if(hashOccurrences!==0)throw new Error('Ambiguous executable integrity hash; prototype not launched.');
const ready={version,root,exePath,profile,vault,probeFile,visibleFile,launcherHash:sha256(nextLauncher),runtimeHash:sha256(nextRuntime),embeddedHashUpdated:hashOccurrences===1};
await fs.writeFile(marker,JSON.stringify(ready,null,2)+'\n','utf8');
console.log(JSON.stringify({prepared:true,...ready}));
