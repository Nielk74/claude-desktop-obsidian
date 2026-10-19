import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {createVault,VaultError} from './vault.mjs';

const fail=(code,message)=>{throw new VaultError(code,message);};
const canonicalKey=value=>process.platform==='win32'?value.toLowerCase():value;
const title=(value,fallback)=>{
 const result=typeof value==='string'?value.trim():fallback;
 if(!result||result.length>80||/[\0\r\n]/.test(result))fail('INVALID_NAME','Give the vault a name of 1–80 characters.');
 return result;
};
function validate(data){
 if(data?.version!==1||!Array.isArray(data.vaults)||data.vaults.length>100||!data.vaults.every(v=>typeof v.id==='string'&&typeof v.name==='string'&&typeof v.path==='string'&&path.isAbsolute(v.path)&&(v.lastNote===null||typeof v.lastNote==='string'))||new Set(data.vaults.map(v=>v.id)).size!==data.vaults.length||!(data.activeId===null||data.vaults.some(v=>v.id===data.activeId)))fail('INVALID_CATALOG','Saved vault settings are invalid. Keep a copy and repair the catalog before continuing.');
 return data;
}

export function createCatalog(file,{defaultVault}={}){
 const empty=()=>({version:1,vaults:[],activeId:null});
 async function load(){
  try{return validate(JSON.parse(await fs.readFile(file,'utf8')));}
  catch(error){if(error.code==='ENOENT')return null;if(error instanceof VaultError)throw error;fail('INVALID_CATALOG','The saved vault catalog could not be read. Your settings have been preserved.');}
 }
 async function entry(directory,name){
  if(typeof directory!=='string'||!path.isAbsolute(directory)||directory.includes('\0'))fail('INVALID_VAULT','Choose an existing vault using its absolute folder path.');
  const canonical=await fs.realpath(directory);await createVault(canonical);
  return {id:randomUUID(),name:title(name,path.basename(canonical)||canonical),path:canonical,lastNote:null};
 }
 async function locked(change){
  await fs.mkdir(path.dirname(file),{recursive:true});const lock=file+'.lock';let handle;
  for(let attempt=0;!handle;attempt++){
   try{handle=await fs.open(lock,'wx');await handle.writeFile(JSON.stringify({pid:process.pid}),'utf8');}
   catch(error){
    if(error.code!=='EEXIST')throw error;
    try{const owner=JSON.parse(await fs.readFile(lock,'utf8'));if(Number.isInteger(owner.pid)){try{process.kill(owner.pid,0);}catch(e){if(e.code==='ESRCH'){await fs.unlink(lock);continue;}}}}catch{}
    if(attempt>=400)fail('CATALOG_BUSY','Vault settings are busy. Try again in a moment.');
    await new Promise(resolve=>setTimeout(resolve,10));
   }
  }
  try{
   let data=await load();const fresh=!data;
   if(!data){data=empty();if(defaultVault){try{const initial=await entry(defaultVault);data.vaults.push(initial);data.activeId=initial.id;}catch{}}}
   const before=JSON.stringify(data);await change(data);
   if(fresh||JSON.stringify(data)!==before){
    validate(data);const temp=file+'.'+randomUUID()+'.tmp';
    try{await fs.writeFile(temp,JSON.stringify(data,null,2)+'\n',{encoding:'utf8',flag:'wx'});await fs.rename(temp,file);}finally{await fs.unlink(temp).catch(()=>{});}
   }
   return data;
  }finally{await handle.close();await fs.unlink(lock);}
 }
 const find=(data,id)=>data.vaults.find(v=>v.id===id)??fail('UNKNOWN_VAULT','That vault is no longer registered. Choose one from your vault list.');
 const read=async()=>await load()??locked(()=>{});
 async function add(directory,name){
  const prepared=await entry(directory,name);
  return locked(data=>{let existing=data.vaults.find(v=>canonicalKey(v.path)===canonicalKey(prepared.path));if(!existing){if(data.vaults.length>=100)fail('VAULT_LIMIT','You can save up to 100 vaults.');data.vaults.push(prepared);existing=prepared;}data.activeId=existing.id;});
 }
 return {
  read,add,
  resolve:async id=>find(await read(),id),
  activate:async id=>{const selected=find(await read(),id);await createVault(selected.path);return locked(data=>{find(data,id);data.activeId=id;});},
  rename:async(id,name)=>locked(data=>{const v=find(data,id);v.name=title(name,v.name);}),
  remove:async id=>locked(data=>{const index=data.vaults.findIndex(v=>v.id===id);find(data,id);data.vaults.splice(index,1);if(data.activeId===id)data.activeId=data.vaults[Math.min(index,data.vaults.length-1)]?.id??null;}),
  remember:async(id,note)=>{const selected=find(await read(),id);const vault=await createVault(selected.path);await vault.read(note);return locked(data=>{find(data,id).lastNote=note;});},
  seedLegacy:async directory=>{
   if((await read()).legacyMigrated)return read();
   const prepared=directory?await entry(directory):null;
   return locked(data=>{if(data.legacyMigrated)return;if(prepared&&!data.vaults.some(v=>canonicalKey(v.path)===canonicalKey(prepared.path))){data.vaults.push(prepared);data.activeId=prepared.id;}data.legacyMigrated=true;});
  }
 };
}
