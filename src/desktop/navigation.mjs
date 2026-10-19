import {mountWorkspace} from './workspace.mjs';

(()=>{
 if(window.__atelierNavigationInstalled)return;window.__atelierNavigationInstalled=true;
 if(!window.atelierObsidian?.request){console.warn('[Atelier Obsidian] Desktop bridge is unavailable.');return;}
 const host=document.createElement('div');host.id='atelier-obsidian-workspace';document.body.append(host);
 let mode='full',nativeMain,previousMargin,tab,sidebar,layoutFrame;
 function syncTheme(){
  const explicit=document.documentElement.dataset.mode;
  const background=getComputedStyle(document.body).backgroundColor.match(/[\d.]+/g),opaque=background&&background.length>=3&&(background.length===3||Number(background[3])>0);
  host.dataset.theme=explicit==='dark'||explicit==='light'?explicit:opaque?(Number(background[0])*.2126+Number(background[1])*.7152+Number(background[2])*.0722<128?'dark':'light'):matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light';
 }
 function restoreChat(){if(nativeMain){nativeMain.style.marginRight=previousMargin;nativeMain=null;}}
 function position(){
  if(!host.hasAttribute('data-visible'))return;const left=sidebar?.getBoundingClientRect().right??280;
  const dock=mode==='dock'&&innerWidth-left>=900,width=Math.min(560,Math.max(420,(innerWidth-left)*.44));
  host.style.left=dock?'auto':Math.max(0,left)+'px';host.style.width=dock?width+'px':'auto';
  if(nativeMain&&!nativeMain.isConnected)nativeMain=null;
  if(dock){if(!nativeMain){nativeMain=document.querySelector('main');if(nativeMain)previousMargin=nativeMain.style.marginRight;}if(nativeMain)nativeMain.style.marginRight=width+'px';}else restoreChat();
 }
 function setLayout(layout){mode=layout;host.dataset.layout=layout;host.setAttribute('data-visible','');position();if(tab)tab.setAttribute('aria-selected',String(layout==='full'));}
 let runtimeVisible=false,runtimeRevision=0;
 function hideRuntime(){if(runtimeVisible){runtimeRevision++;runtimeVisible=false;runtimeButton.textContent='◇ Actual Obsidian · demo';void window.atelierObsidian.request({action:'runtime.prototype.hide'});}}
 function close(){hideRuntime();workspace.hide();host.removeAttribute('data-visible');restoreChat();if(tab)tab.setAttribute('aria-selected','false');}
 const workspace=mountWorkspace(host,async payload=>{const response=await window.atelierObsidian.request(payload);if(!response?.ok)throw new Error(response?.message??'The vault bridge did not respond.');return response.value;},{setLayout,onClose:close});
 const show=layout=>{hideRuntime();void workspace.show(layout);};
 const side=document.createElement('button');side.id='atelier-obsidian-side-access';side.textContent='◇ Vaults';side.title='Open or close Obsidian in your last layout';side.setAttribute('aria-label','Toggle Obsidian workspace');
 side.style.cssText='position:fixed;right:16px;top:54px;z-index:990;border:1px solid #716184;background:#26232c;color:#d2bff2;border-radius:8px;padding:7px 12px;font:12px Segoe UI,system-ui;cursor:pointer;-webkit-app-region:no-drag';side.onclick=()=>host.hasAttribute('data-visible')?close():show();document.body.append(side);
 const runtimeButton=document.createElement('button');runtimeButton.id='atelier-obsidian-runtime-demo';runtimeButton.textContent='◇ Actual Obsidian · demo';runtimeButton.title='Test the actual installed Obsidian renderer with a disposable copied vault';runtimeButton.style.cssText='position:fixed;right:110px;top:54px;z-index:991;border:1px solid #8870b0;background:#292231;color:#dfcff5;border-radius:8px;padding:7px 12px;font:12px Segoe UI,system-ui;cursor:pointer;-webkit-app-region:no-drag';
 runtimeButton.onclick=async()=>{if(runtimeVisible){hideRuntime();return;}close();const revision=++runtimeRevision;runtimeVisible=true;runtimeButton.disabled=true;runtimeButton.textContent='Opening Obsidian…';try{const response=await window.atelierObsidian.request({action:'runtime.prototype.show'});if(revision!==runtimeRevision)return;if(!response?.ok)throw new Error(response?.message??'The runtime did not respond.');runtimeButton.textContent='× Close actual Obsidian';runtimeButton.title='Actual Obsidian · disposable demo · prototype';}catch(error){if(revision!==runtimeRevision)return;runtimeVisible=false;runtimeButton.textContent='Obsidian demo unavailable';runtimeButton.title=error.message;console.error('[Atelier runtime demo]',error.message);}finally{runtimeButton.disabled=false;}};document.body.append(runtimeButton);
 function attach(){
  syncTheme();position();
  if(document.getElementById('atelier-obsidian-primary-tab'))return;
  const native=[...document.querySelectorAll('button,a,[role=tab]')],code=native.find(n=>n.textContent.trim()==='Code'),cowork=native.find(n=>n.textContent.trim()==='Cowork');
  if(!code||!cowork)return;let group=code.parentElement;
  for(let depth=0;group&&depth<3&&!group.contains(cowork);depth++)group=group.parentElement;
  if(!group?.contains(cowork)||group.getBoundingClientRect().width>650)return;
  tab=document.createElement('button');tab.id='atelier-obsidian-primary-tab';tab.type='button';tab.className=code.className;tab.textContent='◇ Obsidian';tab.setAttribute('aria-label','Obsidian vault workspace');tab.setAttribute('aria-selected',String(host.hasAttribute('data-visible')&&mode==='full'));tab.style.cssText='flex:1;min-width:0;white-space:nowrap;font-size:12px;-webkit-app-region:no-drag';tab.onclick=()=>show();group.append(tab);
  if(getComputedStyle(group).display.includes('grid'))group.style.gridTemplateColumns='repeat(3,minmax(0,1fr))';
  sidebar=code.closest('aside,nav,[data-testid="sidebar"]');if(!sidebar){let p=group;for(let i=0;p&&i<5;i++,p=p.parentElement){const r=p.getBoundingClientRect();if(r.left<10&&r.width>=200&&r.width<500&&r.height>innerHeight*.7){sidebar=p;break;}}}
  code.addEventListener('click',close);cowork.addEventListener('click',close);position();
 }
 const observer=new MutationObserver(()=>{cancelAnimationFrame(layoutFrame);layoutFrame=requestAnimationFrame(attach);});observer.observe(document.body,{childList:true,subtree:true});const themeObserver=new MutationObserver(syncTheme);themeObserver.observe(document.documentElement,{attributes:true,attributeFilter:['data-mode','class','style']});themeObserver.observe(document.body,{attributes:true,attributeFilter:['class','style']});matchMedia('(prefers-color-scheme:dark)').addEventListener('change',syncTheme);window.addEventListener('resize',position);window.addEventListener('popstate',close);
 if(window.history&&window.location)for(const method of ['pushState','replaceState']){const original=window.history[method];if(typeof original==='function')window.history[method]=function(...args){const previous=window.location.href,result=original.apply(this,args);if(window.location.href!==previous)close();return result;};}
 attach();
 if(workspace.preferences.visible)show(workspace.preferences.layout);
})();
