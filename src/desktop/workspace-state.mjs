const key='atelier.obsidian.workspace.v1';
const validCanvas=value=>value&&['x','y','width','height'].every(k=>Number.isFinite(value[k]))&&value.width>0&&value.height>0;
const cleanDocument=value=>({scrollTop:Number.isFinite(value?.scrollTop)?Math.max(0,value.scrollTop):0,base:Number.isInteger(value?.base)?Math.max(0,value.base):0,...(validCanvas(value?.canvas)?{canvas:{x:value.canvas.x,y:value.canvas.y,width:value.canvas.width,height:value.canvas.height}}:{})});
export function browserStorage(){try{return typeof localStorage==='undefined'?undefined:localStorage;}catch{return undefined;}}

export function createWorkspaceState(storage=browserStorage()){
 let saved;try{saved=JSON.parse(storage?.getItem(key)??'null');}catch{}
 const state={version:1,layout:saved?.layout==='dock'?'dock':'full',visible:saved?.visible===true,documents:{}};
 if(saved?.version===1&&saved.documents&&typeof saved.documents==='object')for(const[id,value]of Object.entries(saved.documents).slice(-200))state.documents[id]=cleanDocument(value);
 let timer;
 function flush(){clearTimeout(timer);timer=undefined;try{storage?.setItem(key,JSON.stringify(state));}catch{}}
 function changed(){clearTimeout(timer);timer=setTimeout(flush,150);timer.unref?.();}
 return {
  get layout(){return state.layout;},get visible(){return state.visible;},
  setLayout(value){state.layout=value==='dock'?'dock':'full';changed();},
  setVisible(value){state.visible=!!value;changed();},
  document(vaultId,path){return cleanDocument(state.documents[JSON.stringify([vaultId,path])]);},
  rememberDocument(vaultId,path,patch){const id=JSON.stringify([vaultId,path]);state.documents[id]=cleanDocument({...state.documents[id],...patch});const ids=Object.keys(state.documents);if(ids.length>200)delete state.documents[ids[0]];changed();},
  flush
 };
}
