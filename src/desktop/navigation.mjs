import {createControlSettings} from './control-settings.mjs';

(()=>{
 if(window.__atelierNavigationInstalled)return;window.__atelierNavigationInstalled=true;
 if(!window.atelierObsidian?.request){console.warn('[Atelier Obsidian] Desktop bridge is unavailable.');return;}
 const tab=document.createElement('button');tab.id='atelier-obsidian-primary-tab';tab.type='button';tab.setAttribute('aria-label','Obsidian');
 const fallbackStyle='position:fixed;right:16px;top:54px;z-index:991;border:1px solid #8870b0;background:#292231;color:#dfcff5;border-radius:8px;padding:7px 12px;font:12px Segoe UI,system-ui;cursor:pointer;-webkit-app-region:no-drag';tab.style.cssText=fallbackStyle;document.body.append(tab);
 let visible=false,opening=false,revision=0,errorMessage='',frame;
 function render(){tab.textContent=opening&&visible?'Opening Obsidian…':'◇ Obsidian';tab.disabled=opening&&visible;tab.setAttribute('aria-pressed',String(visible));tab.title=errorMessage||(visible?'Close Obsidian · copied demo vault':'Open actual Obsidian · copied demo vault');}
 function hide(){if(!visible)return;revision++;visible=false;opening=false;render();void window.atelierObsidian.request({action:'runtime.prototype.hide'}).catch(error=>console.error('[Atelier Obsidian]',error.message));}
 tab.onclick=async()=>{
  if(visible){hide();return;}const current=++revision;visible=true;opening=true;errorMessage='';render();
  try{const response=await window.atelierObsidian.request({action:'runtime.prototype.show'});if(current!==revision)return;if(!response?.ok)throw new Error(response?.message??'Obsidian did not respond.');}
  catch(error){if(current!==revision)return;visible=false;errorMessage=error.message;console.error('[Atelier Obsidian]',error.message);}
  finally{if(current===revision)opening=false;render();}
 };
 const settings=createControlSettings(document,payload=>window.atelierObsidian.request(payload),{onOpen:hide}),bound=new WeakSet();
 function fallback(){tab.style.cssText=fallbackStyle;if(tab.parentElement!==document.body)document.body.append(tab);}
 function attach(){
  settings.attach();
  const native=[...document.querySelectorAll('button,a,[role=tab]')].filter(node=>!node.getClientRects||node.getClientRects().length>0),code=native.find(n=>n.textContent.trim()==='Code'),cowork=native.find(n=>n.textContent.trim()==='Cowork');
  if(!code||!cowork){fallback();return;}
  let group=code.parentElement;for(let depth=0;group&&depth<3&&!group.contains(cowork);depth++)group=group.parentElement;
  if(!group?.contains(cowork)||group.getBoundingClientRect().width>650){fallback();return;}
  if(tab.parentElement!==group){tab.className=code.className;tab.style.cssText='flex:1;min-width:0;white-space:nowrap;font-size:12px;-webkit-app-region:no-drag';group.append(tab);if(getComputedStyle(group).display.includes('grid'))group.style.gridTemplateColumns='repeat(3,minmax(0,1fr))';}
  for(const button of [code,cowork])if(!bound.has(button)){button.addEventListener('click',hide);bound.add(button);}
 }
 const observer=new MutationObserver(()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(attach);});observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','data-state','aria-hidden']});window.addEventListener('popstate',hide);
 if(window.history&&window.location)for(const method of ['pushState','replaceState']){const original=window.history[method];if(typeof original==='function')window.history[method]=function(...args){const previous=window.location.href,result=original.apply(this,args);if(window.location.href!==previous)hide();return result;};}
 render();attach();
})();
