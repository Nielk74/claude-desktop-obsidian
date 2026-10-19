import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {applyStaged,restoreStaged,sha256} from '../src/desktop/patch.mjs';

const execute=promisify(execFile),project=fileURLToPath(new URL('../',import.meta.url));
const i=process.argv.indexOf('--manifest');const manifestFile=i>=0?path.resolve(process.argv[i+1]):JSON.parse(await fs.readFile(path.join(project,'.local/desktop-ui/latest.json'),'utf8')).manifestFile;
const manifest=JSON.parse(await fs.readFile(manifestFile,'utf8'));
async function isRunning(root){
 if(process.platform!=='win32')throw new Error('This installer targets Windows Desktop.');
 const {stdout}=await execute('powershell.exe',['-NoProfile','-NonInteractive','-Command',"@(Get-CimInstance Win32_Process -Filter \"Name='claude.exe'\" | ForEach-Object { $_.ExecutablePath }) | ConvertTo-Json -Compress"],{windowsHide:true});
 const parsed=stdout.trim()?JSON.parse(stdout):[];const paths=Array.isArray(parsed)?parsed:[parsed];return paths.some(p=>typeof p==='string'&&path.resolve(p).toLowerCase()===path.join(root,'claude.exe').toLowerCase());
}
if(process.argv.includes('--status')){
 const states=[];for(const file of manifest.files){const current=sha256(await fs.readFile(path.join(manifest.installDir,...file.relative.split('/'))));states.push({file:file.relative,state:current===file.patchedHash?'patched':current===file.originalHash?'original':'changed'});}console.log(JSON.stringify({manifestFile,states,running:await isRunning(manifest.installDir)}));
}else{
 const result=await(process.argv.includes('--restore')?restoreStaged:applyStaged)(manifest,{isRunning});console.log(JSON.stringify({...result,restored:process.argv.includes('--restore'),manifestFile}));
}
