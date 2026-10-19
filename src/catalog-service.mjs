import {createCatalog} from './vault-catalog.mjs';
import {createVault,VaultError} from './vault.mjs';

export function isTrustedDesktopFrame(url,isMainFrame){
 if(!isMainFrame)return false;
 try{const parsed=new URL(url);return parsed.protocol==='app:'&&parsed.hostname==='localhost'&&!parsed.port&&!parsed.username&&!parsed.password;}catch{return false;}
}

export function createCatalogService({catalogFile,defaultVault}){
 const catalog=createCatalog(catalogFile,{defaultVault});
 return async request=>{
  if(!request||Array.isArray(request)||typeof request!=='object'||Buffer.byteLength(JSON.stringify(request))>3*1024*1024)throw new VaultError('INVALID_REQUEST','The vault request is invalid or too large.');
  const {action,vaultId,args={}}=request;
  if(!args||typeof args!=='object'||Array.isArray(args))throw new VaultError('INVALID_REQUEST','Vault arguments must be an object.');
  switch(action){
   case 'catalog.list':return catalog.read();
   case 'catalog.add':return catalog.add(args.path,args.name);
   case 'catalog.activate':return catalog.activate(vaultId);
   case 'catalog.rename':return catalog.rename(vaultId,args.name);
   case 'catalog.remove':return catalog.remove(vaultId);
   case 'catalog.remember':return catalog.remember(vaultId,args.path);
   case 'catalog.migrate':return catalog.seedLegacy(args.path);
  }
  if(!['vault.list','vault.search','vault.read','vault.canvas','vault.base','vault.save','vault.create'].includes(action))throw new VaultError('INVALID_ACTION','Unknown vault action.');
  const selected=await catalog.resolve(vaultId),vault=await createVault(selected.path);
  switch(action){
   case 'vault.list':return {name:selected.name,files:await vault.list()};
   case 'vault.search':return {files:await vault.search(args.query)};
   case 'vault.read':return vault.read(args.path);
   case 'vault.canvas':return vault.canvas(args.path);
   case 'vault.base':return vault.base(args.path);
   case 'vault.save':return vault.save(args.path,args.content,args.version);
   case 'vault.create':return vault.create(args.path,args.content);
  }
 };
}
