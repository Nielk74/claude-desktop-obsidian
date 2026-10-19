import {createControlSettings} from './control-settings.mjs';
import {measureRuntimeLayout} from './runtime-layout.mjs';

(()=>{
 if(window.__atelierNavigationInstalled)return;window.__atelierNavigationInstalled=true;
 if(!window.atelierObsidian?.request){console.warn('[Atelier Obsidian] Desktop bridge is unavailable.');return;}
 const tab=document.createElement('button');tab.id='atelier-obsidian-primary-tab';tab.type='button';tab.setAttribute('aria-label','Obsidian');
 const fallbackStyle='position:fixed;right:156px;top:4px;z-index:991;border:1px solid #8870b0;background:#292231;color:#dfcff5;border-radius:8px;padding:4px 10px;font:12px Segoe UI,system-ui;cursor:pointer;-webkit-app-region:no-drag';tab.style.cssText=fallbackStyle;document.body.append(tab);
 let visible=false,opening=false,revision=0,errorMessage='',frame,lastLayout,transitionFrame,transitions=0;
 const readLayout=()=>measureRuntimeLayout(document,{width:window.innerWidth,height:window.innerHeight});
 function syncLayout(){
  if(!visible)return;const layout=readLayout();if(!layout)return;const signature=JSON.stringify(layout);if(signature===lastLayout)return;lastLayout=signature;
  void window.atelierObsidian.request({action:'runtime.prototype.layout',args:{layout}}).then(response=>{if(!response?.ok)throw new Error(response?.message??'Obsidian layout did not update.');}).catch(error=>{if(lastLayout===signature)lastLayout=null;console.error('[Atelier Obsidian]',error.message);});
 }
 function render(){tab.textContent=opening&&visible?'Opening Obsidian…':'◇ Obsidian';tab.disabled=opening&&visible;tab.setAttribute('aria-pressed',String(visible));tab.title=errorMessage||(visible?'Close Obsidian · copied demo vault':'Open actual Obsidian · copied demo vault');}
 function hide(){if(!visible)return;revision++;visible=false;opening=false;transitions=0;cancelAnimationFrame(transitionFrame);transitionFrame=null;render();void window.atelierObsidian.request({action:'runtime.prototype.hide'}).catch(error=>console.error('[Atelier Obsidian]',error.message));}
 tab.onclick=async()=>{
  if(visible){hide();return;}const current=++revision;visible=true;opening=true;errorMessage='';const layout=readLayout();lastLayout=JSON.stringify(layout);render();
  try{const response=await window.atelierObsidian.request({action:'runtime.prototype.show',...(layout?{args:{layout}}:{})});if(current!==revision)return;if(!response?.ok)throw new Error(response?.message??'Obsidian did not respond.');}
  catch(error){if(current!==revision)return;visible=false;errorMessage=error.message;console.error('[Atelier Obsidian]',error.message);}
  finally{if(current===revision)opening=false;render();}
 };
 const settings=createControlSettings(document,payload=>window.atelierObsidian.request(payload),{onOpen:hide}),bound=new WeakSet();
 const resizeObserver=typeof ResizeObserver==='function'?new ResizeObserver(()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(attach);}):null;let observed=[];
 function watchLayout(){if(!resizeObserver)return;const targets=[document.documentElement??document.body,document.querySelector?.('.dframe-sidebar'),document.querySelector?.('.dframe-sidebar-body'),document.querySelector?.('.dframe-chrome-bar')].filter(Boolean);if(targets.length===observed.length&&targets.every((target,index)=>target===observed[index]))return;resizeObserver.disconnect();observed=targets;for(const target of targets)resizeObserver.observe(target);}
 function fallback(){
  if(tab.parentElement!==document.body){tab.style.cssText=fallbackStyle;document.body.append(tab);}
  const chrome=document.querySelector?.('.dframe-chrome-bar'),reserve=chrome?parseFloat(getComputedStyle(chrome).getPropertyValue('--df-chrome-bar-caption-reserve')):144,right=Math.ceil((Number.isFinite(reserve)?reserve:144)+12)+'px';if(tab.style.right!==right)tab.style.right=right;
 }
 function visibleControl(node){
  const rect=node.getBoundingClientRect();if(rect.width<=0||rect.height<=0||rect.right<=0||rect.bottom<=0||rect.left>=window.innerWidth||rect.top>=window.innerHeight)return false;
  for(let parent=node;parent;parent=parent.parentElement){const style=getComputedStyle(parent);if(style.display==='none'||style.visibility==='hidden'||style.opacity==='0')return false;}return true;
 }
 function attach(){
  settings.attach();watchLayout();syncLayout();
  const native=[...document.querySelectorAll('button,a,[role=tab]')],code=native.find(n=>n.textContent.trim()==='Code'&&visibleControl(n)),cowork=native.find(n=>n.textContent.trim()==='Cowork'&&visibleControl(n));
  if(!code||!cowork){fallback();return;}
  let group=code.parentElement;for(let depth=0;group&&depth<3&&!group.contains(cowork);depth++)group=group.parentElement;
  if(!group?.contains(cowork)||group.getBoundingClientRect().width>650){fallback();return;}
  if(tab.parentElement!==group){tab.className=code.className;tab.style.cssText='flex:1;min-width:0;white-space:nowrap;font-size:12px;-webkit-app-region:no-drag';group.append(tab);if(getComputedStyle(group).display.includes('grid'))group.style.gridTemplateColumns='repeat(3,minmax(0,1fr))';}
  for(const button of [code,cowork])if(!bound.has(button)){button.addEventListener('click',hide);bound.add(button);}
 }
 const schedule=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(attach);};
 function followTransition(){transitionFrame=null;syncLayout();if(visible&&transitions>0)transitionFrame=requestAnimationFrame(followTransition);}
 function transition(event){if(!event.target?.matches?.('.dframe-sidebar, .dframe-sidebar-body, .dframe-root'))return;if(event.type==='transitionrun'){transitions++;if(visible&&!transitionFrame)followTransition();}else{transitions=Math.max(0,transitions-1);schedule();}}
 for(const event of ['transitionrun','transitionend','transitioncancel'])document.addEventListener?.(event,transition,true);
 const observer=new MutationObserver(schedule);observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','data-state','aria-hidden','class','style','data-collapsed','data-hovering','data-peeked']});window.addEventListener('popstate',hide);window.addEventListener('resize',schedule);
 if(window.history&&window.location)for(const method of ['pushState','replaceState']){const original=window.history[method];if(typeof original==='function')window.history[method]=function(...args){const previous=window.location.href,result=original.apply(this,args);if(window.location.href!==previous)hide();return result;};}
 render();attach();
})();
