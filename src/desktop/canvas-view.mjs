import DOMPurify from 'dompurify';
import {canvasSvg} from '../../mods/obsidian/hooks/presentation.js';
import {canvasLayout} from '../render.mjs';
import {imageSource} from './media.mjs';

const valid=value=>value&&['x','y','width','height'].every(k=>Number.isFinite(value[k]))&&value.width>0&&value.height>0;
export function createCanvasCamera(bounds,initial){
 let view=valid(initial)?{...initial}:{...bounds},fitWidth=bounds.width;
 const api={get view(){return {...view};},
  fit(width,height){const ratio=Math.max(1,width)/Math.max(1,height),w=Math.max(bounds.width,bounds.height*ratio),h=w/ratio;view={x:bounds.x+(bounds.width-w)/2,y:bounds.y+(bounds.height-h)/2,width:w,height:h};fitWidth=w;},
  resize(width,height){const nextWidth=view.height*Math.max(1,width)/Math.max(1,height);view={...view,x:view.x+(view.width-nextWidth)/2,width:nextWidth};fitWidth=Math.max(bounds.width,bounds.height*Math.max(1,width)/Math.max(1,height));},
  pan(dx,dy,width,height){view={...view,x:view.x-dx*view.width/Math.max(1,width),y:view.y-dy*view.height/Math.max(1,height)};},
  zoom(factor,rx=.5,ry=.5){if(!Number.isFinite(factor)||factor<=0)return;const width=Math.min(fitWidth*8,Math.max(fitWidth/32,view.width/factor)),scale=width/view.width;view={x:view.x+view.width*rx*(1-scale),y:view.y+view.height*ry*(1-scale),width,height:view.height*scale};},
  get percent(){return Math.round(fitWidth/view.width*100);}
 };return api;
}

export function mountCanvas(container,data,{initial,onChange=()=>{},openFile}){
 const frame=document.createElement('div');frame.className='canvas-viewport';frame.tabIndex=0;frame.setAttribute('aria-label','Canvas board. Drag to pan, scroll to zoom, arrow keys to move, zero to fit.');
 frame.innerHTML=DOMPurify.sanitize(canvasSvg(data),{USE_PROFILES:{svg:true,svgFilters:true}});
 const svg=frame.querySelector('svg');svg.setAttribute('preserveAspectRatio','none');svg.setAttribute('role','img');svg.setAttribute('aria-label',data.path);
 const camera=createCanvasCamera(canvasLayout(data.nodes),initial),controls=document.createElement('div');controls.className='canvas-controls';const label=document.createElement('span');label.className='canvas-zoom';
 function draw(){const v=camera.view;svg.setAttribute('viewBox',`${v.x} ${v.y} ${v.width} ${v.height}`);label.textContent=camera.percent+'%';onChange(v);}
 function rect(){return frame.getBoundingClientRect();}
 function fit(){const r=rect();camera.fit(r.width,r.height);draw();}
 function button(text,title,action){const b=document.createElement('button');b.type='button';b.textContent=text;b.title=title;b.setAttribute('aria-label',title);b.onclick=action;return b;}
 controls.append(button('−','Zoom out',()=>{camera.zoom(1/1.25);draw();}),label,button('+','Zoom in',()=>{camera.zoom(1.25);draw();}),button('Fit','Fit entire Canvas',fit));
 const hint=document.createElement('div');hint.className='canvas-hint';hint.textContent='Drag to move · Scroll to zoom · Double-click a note to open';
 container.append(frame,controls,hint);
 for(const n of data.nodes){if(!n.asset&&!n.svg)continue;const source=imageSource(n.svg?{kind:'svg',content:n.svg}:{dataUrl:n.asset});if(!source)continue;const image=document.createElementNS('http://www.w3.org/2000/svg','image');for(const[k,value]of Object.entries({x:n.x+12,y:n.y+48,width:Math.max(1,n.width-24),height:Math.max(1,n.height-60),href:source,preserveAspectRatio:'xMidYMid meet'}))image.setAttribute(k,String(value));svg.append(image);}
 let drag;
 frame.onpointerdown=event=>{if(event.button!==0&&event.button!==1)return;event.preventDefault();frame.focus();frame.setPointerCapture(event.pointerId);drag={id:event.pointerId,x:event.clientX,y:event.clientY};frame.classList.add('dragging');};
 frame.onpointermove=event=>{if(!drag||drag.id!==event.pointerId)return;const r=rect();camera.pan(event.clientX-drag.x,event.clientY-drag.y,r.width,r.height);drag.x=event.clientX;drag.y=event.clientY;draw();};
 const release=event=>{if(drag?.id!==event.pointerId)return;drag=null;frame.classList.remove('dragging');if(frame.hasPointerCapture(event.pointerId))frame.releasePointerCapture(event.pointerId);};
 frame.onpointerup=release;frame.onpointercancel=release;frame.onlostpointercapture=()=>{drag=null;frame.classList.remove('dragging');};
 frame.addEventListener('wheel',event=>{event.preventDefault();const r=rect(),delta=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?r.height:1);camera.zoom(Math.exp(-Math.max(-500,Math.min(500,delta))*.002),(event.clientX-r.left)/Math.max(1,r.width),(event.clientY-r.top)/Math.max(1,r.height));draw();},{passive:false});
 frame.onkeydown=event=>{const r=rect();if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();camera.pan(event.key==='ArrowLeft'?70:event.key==='ArrowRight'?-70:0,event.key==='ArrowUp'?70:event.key==='ArrowDown'?-70:0,r.width,r.height);draw();}else if(['+','=','-','0','Home'].includes(event.key)){event.preventDefault();if(event.key==='0'||event.key==='Home')fit();else{camera.zoom(event.key==='-'?1/1.25:1.25);draw();}}};
 frame.ondblclick=event=>{const r=rect(),v=camera.view,x=v.x+(event.clientX-r.left)*v.width/r.width,y=v.y+(event.clientY-r.top)*v.height/r.height;const card=[...data.nodes].reverse().find(n=>n.type==='file'&&x>=n.x&&x<=n.x+n.width&&y>=n.y&&y<=n.y+n.height);if(card)openFile(card.file);else{camera.zoom(2,(event.clientX-r.left)/r.width,(event.clientY-r.top)/r.height);draw();}};
 let initialized=false;const resize=()=>{const r=rect();if(!r.width||!r.height)return;if(!initialized&&!valid(initial))camera.fit(r.width,r.height);else camera.resize(r.width,r.height);initialized=true;draw();};
 const observer=typeof ResizeObserver==='undefined'?null:new ResizeObserver(resize);observer?.observe(frame);requestAnimationFrame(resize);
 return {get view(){return camera.view;},dispose(){observer?.disconnect();}};
}
