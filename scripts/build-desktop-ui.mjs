import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {readAsar,repackAsar,updateEmbeddedHash,injectWorkspace,sha256,checkUpdateBase} from '../src/desktop/patch.mjs';

const project=fileURLToPath(new URL('../',import.meta.url));
const arg=name=>{const i=process.argv.indexOf(name);return i<0?null:process.argv[i+1];};
const installDir=path.resolve(arg('--install-dir')??path.join(process.env.LOCALAPPDATA,'AnthropicClaude','app-2.42304.2'));
const catalogFile=path.join(process.env.LOCALAPPDATA,'Claude-3p','atelier-obsidian','vaults.json'),defaultVault=path.join(project,'Atelier Demo Vault');
const buildDir=path.join(project,'.local','desktop-ui','build');await fs.mkdir(buildDir,{recursive:true});
await build({absWorkingDir:project,entryPoints:['src/desktop/main.mjs'],outfile:path.join(buildDir,'main.cjs'),bundle:true,platform:'node',format:'cjs',target:'node22',external:['electron'],minify:true,legalComments:'none',define:{__ATELIER_CONFIG__:JSON.stringify({catalogFile,defaultVault,project})}});
await build({absWorkingDir:project,entryPoints:['src/desktop/navigation.mjs'],outfile:path.join(buildDir,'workspace.js'),bundle:true,platform:'browser',format:'iife',target:'es2022',loader:{'.css':'text'},minify:true,legalComments:'none'});
if(process.argv.includes('--build-only')){console.log(JSON.stringify({built:true,buildDir}));process.exit(0);}
const stage=path.join(project,'.local','desktop-ui',new Date().toISOString().replace(/[:.]/g,'-'));await fs.mkdir(stage,{recursive:true});
const [archive,exe,html,main,preload,script]=await Promise.all([fs.readFile(path.join(installDir,'resources/app.asar')),fs.readFile(path.join(installDir,'claude.exe')),fs.readFile(path.join(installDir,'resources/ion-dist/index.html'),'utf8'),fs.readFile(path.join(buildDir,'main.cjs')),fs.readFile(path.join(project,'src/desktop/preload.cjs')),fs.readFile(path.join(buildDir,'workspace.js'),'utf8')]);
const original=readAsar(archive),pkg=JSON.parse(original.read('package.json').toString('utf8'));
if(pkg.version!=='2.42304.2')throw new Error('This UI patch has been verified only for Desktop 2.42304.2.');
const updating=original.read(pkg.main).includes('atelier-main:start');let previousManifestFile;
if(updating){
 if(!process.argv.includes('--update'))throw new Error('Desktop is already patched. Use --update to stage against its verified previous manifest.');
 previousManifestFile=path.resolve(arg('--base-manifest')??JSON.parse(await fs.readFile(path.join(project,'.local/desktop-ui/latest.json'),'utf8')).manifestFile);
 const previous=JSON.parse(await fs.readFile(previousManifestFile,'utf8'));
 checkUpdateBase(previous,installDir,{'claude.exe':exe,'resources/app.asar':archive,'resources/ion-dist/index.html':Buffer.from(html,'utf8')});
 if(!original.read('.vite/build/mainView.js').toString('utf8').endsWith(preload.toString('utf8')))throw new Error('The installed preload differs from this build. Restore before staging a bridge change.');
}
const additions=updating?{'.vite/build/atelier/main.cjs':main}:{
 [pkg.main]:Buffer.concat([original.read(pkg.main),Buffer.from('\n;/* atelier-main:start */try{require("./atelier/main.cjs")}catch(e){console.error("[Atelier Obsidian]",e)}/* atelier-main:end */\n')]),
 '.vite/build/mainView.js':Buffer.concat([original.read('.vite/build/mainView.js'),Buffer.from('\n'),preload]),
 '.vite/build/atelier/main.cjs':main
};
const nextArchive=repackAsar(archive,additions),patched=readAsar(nextArchive),nextExe=updateEmbeddedHash(exe,original.headerHash,patched.headerHash);
let verifiedEntries=0;function verify(node,prefix=''){for(const[name,entry]of Object.entries(node.files??{})){const file=prefix+name;if(entry.files)verify(entry,file+'/');else if(!entry.unpacked&&!entry.link){const expected=Object.hasOwn(additions,file)?additions[file]:original.read(file);if(!patched.read(file).equals(expected))throw new Error('Archive verification failed: '+file);verifiedEntries++;}}}verify(original.header);
const hashOffset=exe.indexOf(original.headerHash);if(!exe.subarray(0,hashOffset).equals(nextExe.subarray(0,hashOffset))||!exe.subarray(hashOffset+64).equals(nextExe.subarray(hashOffset+64)))throw new Error('Unexpected executable changes');
const outputs={'claude.exe':nextExe,'resources/app.asar':nextArchive,'resources/ion-dist/index.html':Buffer.from(injectWorkspace(html,{script,style:''}),'utf8')},originals={'claude.exe':exe,'resources/app.asar':archive,'resources/ion-dist/index.html':Buffer.from(html,'utf8')},files=[];
for(const[relative,bytes]of Object.entries(outputs)){
 const backup=path.join(stage,'backup',...relative.split('/')),staged=path.join(stage,'patched',...relative.split('/'));await fs.mkdir(path.dirname(backup),{recursive:true});await fs.mkdir(path.dirname(staged),{recursive:true});await fs.writeFile(backup,originals[relative],{flag:'wx'});await fs.writeFile(staged,bytes,{flag:'wx'});files.push({relative,backup,staged,originalHash:sha256(originals[relative]),patchedHash:sha256(bytes)});
}
const manifest={version:1,desktopVersion:pkg.version,createdAt:new Date().toISOString(),installDir,catalogFile,verifiedEntries,embeddedHashOffset:hashOffset,...(previousManifestFile?{previousManifestFile}:{}),files};const manifestFile=path.join(stage,'manifest.json');await fs.writeFile(manifestFile,JSON.stringify(manifest,null,2)+'\n','utf8');await fs.writeFile(path.join(project,'.local/desktop-ui/latest.json'),JSON.stringify({manifestFile})+'\n','utf8');
console.log(JSON.stringify({staged:true,manifestFile,verifiedEntries,desktopVersion:pkg.version,executableChange:'Embedded ASAR hash only; fuses unchanged'}));
