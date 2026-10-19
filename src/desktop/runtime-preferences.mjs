import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';

export function createRuntimePreferences(file,{apply=async()=>{}}={}){
 let queue=Promise.resolve();
 const serialized=operation=>{const result=queue.then(operation);queue=result.catch(()=>{});return result;};
 async function load(){
  try{
   const value=JSON.parse(await fs.readFile(file,'utf8'));
   if(value?.version!==1||!['minimal','all'].includes(value.controls))throw new Error('Invalid controls');
   return{controls:value.controls};
  }catch(error){if(error.code==='ENOENT')return{controls:'minimal'};throw new Error('Saved Obsidian preferences could not be read. The file has been preserved.');}
 }
 return{
  get:()=>serialized(load),
  withCurrent:operation=>serialized(async()=>operation(await load())),
  set:controls=>serialized(async()=>{
   if(!['minimal','all'].includes(controls))throw new Error('Choose minimal or all Obsidian controls.');
   const previous=await load(),temporary=file+'.'+randomUUID()+'.tmp';
   try{
    await apply(controls);
    await fs.mkdir(path.dirname(file),{recursive:true});
    await fs.writeFile(temporary,JSON.stringify({version:1,controls},null,2)+'\n',{encoding:'utf8',flag:'wx'});
    await fs.rename(temporary,file);
    return{controls};
   }catch(error){await apply(previous.controls).catch(()=>{});throw error;}
   finally{await fs.unlink(temporary).catch(()=>{});}
  })
 };
}
