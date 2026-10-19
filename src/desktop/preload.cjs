;(()=>{
 try{
  const {contextBridge,ipcRenderer}=require('electron');
  contextBridge.exposeInMainWorld('atelierObsidian',Object.freeze({
   request:request=>ipcRenderer.invoke('atelier:obsidian:request',request)
  }));
 }catch(error){console.warn('[Atelier Obsidian] The vault bridge could not be attached:',error.message);}
})();
