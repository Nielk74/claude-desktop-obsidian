import {createVault} from './vault.mjs';
import {createCatalogService} from './catalog-service.mjs';

async function main(){try {
 const chunks=[];let length=0;
 for await(const chunk of process.stdin){length+=chunk.length;if(length>3*1024*1024)throw new Error('Request too large.');chunks.push(chunk);}
 const {root,action,args={},catalogFile,catalogDefault,vaultId}=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks)));
 if(catalogFile&&(action.startsWith('catalog.')||vaultId)){
  const service=createCatalogService({catalogFile,defaultVault:catalogDefault});
  const value=await service({action:action.startsWith('catalog.')?action:'vault.'+action,args,vaultId});
  process.stdout.write(JSON.stringify({ok:true,value}));return;
 }
 if(!['list','search','read','canvas','base','save','create'].includes(action))throw new Error('Unknown vault action.');
 const vault=await createVault(root);
 let value;
 switch(action){
  case 'list':value={name:vault.name,files:await vault.list()};break;
  case 'search':value={files:await vault.search(args.query)};break;
  case 'read':value=await vault.read(args.path);break;
  case 'canvas':value=await vault.canvas(args.path);break;
  case 'base':value=await vault.base(args.path);break;
  case 'save':value=await vault.save(args.path,args.content,args.version);break;
  case 'create':value=await vault.create(args.path,args.content);break;
 }
 process.stdout.write(JSON.stringify({ok:true,value}));
}catch(error){
 process.stdout.write(JSON.stringify({ok:false,code:error.code??'ERROR',message:error.message}));process.exitCode=1;
}}
void main();
