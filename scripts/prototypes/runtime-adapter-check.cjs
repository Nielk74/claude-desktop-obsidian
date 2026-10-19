// Real Electron integration check of the adapter that will be staged for Claude.
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {pathToFileURL}=require('url');
const {app,Menu,nativeTheme}=require('electron');
module.exports=async function(host,config,log){
 const project=path.resolve(__dirname,'../..');
 const themeListener=()=>{};nativeTheme.on('updated',themeListener);
 const before={name:app.name,path:app.getPath('userData'),menu:Menu.getApplicationMenu(),argv:[...process.argv]};
 const {createRuntimePrototype}=await import(pathToFileURL(path.join(project,'src/desktop/runtime-prototype.mjs')).href);
 const request=createRuntimePrototype({project,defaultVault:path.join(project,'Atelier Demo Vault')});
 await request(host,'runtime.prototype.show');
 let view;
 for(let attempt=0;attempt<80;attempt++){
  view=host.contentView.children.find(child=>child.webContents?.getURL().includes('obsidian.md/index.html'));
  if(view&&await view.webContents.executeJavaScript('!!window.app?.workspace?.layoutReady'))break;
  await new Promise(resolve=>setTimeout(resolve,250));
 }
 assert.ok(view,'Runtime view should be attached to the host');assert.equal(await view.webContents.executeJavaScript('!!window.app?.workspace?.layoutReady'),true);
 await request(host,'runtime.prototype.hide');assert.equal(view.getVisible(),false);
 await request(host,'runtime.prototype.show');assert.equal(view.getVisible(),true);
 await view.webContents.executeJavaScript('window.app.workspace.openLinkText("07 Canvases/Claude Obsidian - working canvas.canvas","",false)');
 assert.equal(await view.webContents.executeJavaScript('window.app.workspace.activeLeaf.view.getViewType()'),'canvas');
 assert.equal(app.name,before.name);assert.equal(app.getPath('userData'),before.path);assert.equal(Menu.getApplicationMenu(),before.menu);assert.deepEqual(process.argv,before.argv);
 assert.ok(nativeTheme.listeners('updated').includes(themeListener),'The host theme listener must survive Obsidian startup');
 await new Promise(resolve=>setTimeout(resolve,1000));
 const image=await view.webContents.capturePage();fs.writeFileSync(path.join(config.root,'adapter-canvas.png'),image.toPNG());
 log('adapter-check-passed',{hostSettingsPreserved:true,hideShow:true,canvas:true,bounds:view.getBounds(),imageBytes:image.toPNG().length});
};
