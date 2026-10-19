import {ipcMain,dialog,BrowserWindow} from 'electron';
import {createCatalogService,isTrustedDesktopFrame} from '../catalog-service.mjs';
import {createRuntimePrototype} from './runtime-prototype.mjs';

const service=createCatalogService(__ATELIER_CONFIG__);
const runtimePrototype=createRuntimePrototype(__ATELIER_CONFIG__);
ipcMain.handle('atelier:obsidian:request',async(event,request)=>{
 try{
  if(!isTrustedDesktopFrame(event.senderFrame?.url,event.senderFrame===event.sender.mainFrame))throw new Error('This vault bridge is available only in the main local Claude window.');
  if(request?.action?.startsWith('runtime.prototype.')||request?.action?.startsWith('runtime.preferences.'))return {ok:true,value:await runtimePrototype(BrowserWindow.fromWebContents(event.sender),request.action,request.args)};
  if(request?.action==='catalog.pick'){
   const window=BrowserWindow.fromWebContents(event.sender),options={title:'Add an Obsidian vault',buttonLabel:'Add vault',properties:['openDirectory']};
   const picked=await(window?dialog.showOpenDialog(window,options):dialog.showOpenDialog(options));
   if(picked.canceled||!picked.filePaths[0])return {ok:true,value:null};
   return {ok:true,value:await service({action:'catalog.add',args:{path:picked.filePaths[0]}})};
  }
  return {ok:true,value:await service(request)};
 }catch(error){return {ok:false,code:error.code??'ERROR',message:error.message??'The vault operation failed.'};}
});
