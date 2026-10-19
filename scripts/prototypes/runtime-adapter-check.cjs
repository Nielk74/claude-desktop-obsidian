// Real Electron integration check of the adapter that will be staged for Claude.
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {pathToFileURL}=require('url');
const {app,Menu,nativeTheme}=require('electron');
module.exports=async function(host,config,log){
 const sourceProject=path.resolve(__dirname,'../..'),project=path.join(config.root,'adapter-project');
 // Keep tests out of the profile/vault used by the running Claude window.
 for(const directory of ['scripts/prototypes','src/desktop'])fs.mkdirSync(path.join(project,directory),{recursive:true});
 for(const file of ['scripts/prototypes/runtime-scope.cjs','scripts/prototypes/runtime-scope-preload.cjs','src/desktop/obsidian-minimal.css'])fs.copyFileSync(path.join(sourceProject,file),path.join(project,file));
 fs.writeFileSync(path.join(project,'package.json'),'{"private":true}','utf8');
 const themeListener=()=>{};nativeTheme.on('updated',themeListener);
 const before={name:app.name,path:app.getPath('userData'),menu:Menu.getApplicationMenu(),argv:[...process.argv]};
 const {createRuntimePrototype}=await import(pathToFileURL(path.join(sourceProject,'src/desktop/runtime-prototype.mjs')).href);
 const request=createRuntimePrototype({project,installed:config.installed,runtimePrefix:'atelier:adapter-check:'+process.pid+':',defaultVault:path.join(sourceProject,'Atelier Demo Vault')});
 await request(host,'runtime.preferences.set',{controls:'all'});
 const [contentWidth,contentHeight]=host.getContentSize(),layout={left:450,top:45,viewport:{width:contentWidth*1.25,height:contentHeight*1.25}};
 await request(host,'runtime.prototype.show',{layout});
 let view;
 for(let attempt=0;attempt<80;attempt++){
  view=host.contentView.children.find(child=>child.webContents?.getURL().includes('obsidian.md/index.html'));
  if(view&&await view.webContents.executeJavaScript('!!window.app?.workspace?.layoutReady'))break;
  await new Promise(resolve=>setTimeout(resolve,250));
 }
 assert.ok(view,'Runtime view should be attached to the host');assert.equal(await view.webContents.executeJavaScript('!!window.app?.workspace?.layoutReady'),true);
 assert.deepEqual(view.getBounds(),{x:360,y:36,width:contentWidth-360,height:contentHeight-36});
 await request(host,'runtime.prototype.layout',{layout:{...layout,left:500}});assert.equal(view.getBounds().x,400);
 await request(host,'runtime.prototype.layout',{layout:{...layout,left:0}});assert.equal(view.getBounds().x,0);
 await request(host,'runtime.prototype.layout',{layout});
 log('adapter-layout-passed',{sidebarFollows:true,zoomCorrect:true,titlebarFits:true,bounds:view.getBounds()});
 async function checkControls(mode){
  await request(host,'runtime.preferences.set',{controls:mode});
  let width;
  for(let attempt=0;attempt<80;attempt++){width=await view.webContents.executeJavaScript('document.querySelector(".workspace-ribbon.mod-primary")?.getBoundingClientRect().width');if(mode==='minimal'?width===0:width>0)break;await new Promise(resolve=>setTimeout(resolve,100));}
  assert.ok(mode==='minimal'?width===0:width>0,mode+' controls must be rendered');
  assert.equal((await createRuntimePrototype({project})(null,'runtime.preferences.get')).controls,mode);
 }
 await checkControls('minimal');await checkControls('all');await checkControls('minimal');
 await request(host,'runtime.prototype.hide');assert.equal(view.getVisible(),false);
 await request(host,'runtime.prototype.show',{layout:{...layout,left:500}});assert.equal(view.getVisible(),true);assert.equal(view.getBounds().x,400);
 await request(host,'runtime.prototype.layout',{layout});
 await view.webContents.executeJavaScript('window.app.workspace.openLinkText("07 Canvases/Claude Obsidian - working canvas.canvas","",false)');
 assert.equal(await view.webContents.executeJavaScript('window.app.workspace.activeLeaf.view.getViewType()'),'canvas');
 assert.equal(app.name,before.name);assert.equal(app.getPath('userData'),before.path);assert.equal(Menu.getApplicationMenu(),before.menu);assert.deepEqual(process.argv,before.argv);
 assert.ok(nativeTheme.listeners('updated').includes(themeListener),'The host theme listener must survive Obsidian startup');
 await new Promise(resolve=>setTimeout(resolve,1000));
 log('adapter-controls-passed',{controlsSwitch:true,controlsPersisted:true,hostSettingsPreserved:true,hideShow:true,canvas:true});
 let image;
 try{image=await view.webContents.capturePage(undefined,{stayHidden:true,stayAwake:true});fs.writeFileSync(path.join(config.root,'adapter-canvas.png'),image.toPNG());}catch(error){log('adapter-capture-unavailable',{message:error.message});}
 log('adapter-check-passed',{controlsSwitch:true,controlsPersisted:true,hostSettingsPreserved:true,hideShow:true,canvas:true,bounds:view.getBounds(),imageBytes:image?.toPNG().length??null});
};
