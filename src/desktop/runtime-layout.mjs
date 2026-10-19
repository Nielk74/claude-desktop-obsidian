const finite=value=>typeof value==='number'&&Number.isFinite(value);
const viewportValid=value=>value&&finite(value.width)&&finite(value.height)&&value.width>0&&value.height>0&&value.width<=65536&&value.height<=65536;
const clamp=(value,max)=>Math.max(0,Math.min(value,Math.max(0,max-1)));

export function measureRuntimeLayout(document,viewport){
 if(!viewportValid(viewport))return null;
 const sidebar=document.querySelector?.('.dframe-sidebar')??document.querySelector?.('[data-testid="sidebar"]')?.closest?.('aside')??document.querySelector?.('aside');
 const chrome=document.querySelector?.('.dframe-chrome-bar');
 const side=sidebar?.getBoundingClientRect(),top=chrome?.getBoundingClientRect();
 const root=sidebar?.closest?.('.dframe-root')??document.querySelector?.('.dframe-root'),peek=root?.hasAttribute?.('data-collapsed')&&root.hasAttribute('data-hovering')?document.querySelector?.('.dframe-sidebar-body')?.getBoundingClientRect():null;
 const left=Math.max(side&&finite(side.right)&&side.height>0?side.right:0,peek&&finite(peek.right)&&peek.height>0?peek.right:0);
 return{left:clamp(left,viewport.width),top:clamp(top&&finite(top.bottom)&&top.height>0?top.bottom:36,viewport.height),viewport:{width:viewport.width,height:viewport.height}};
}

export function fitRuntimeBounds([width,height],layout){
 width=Math.max(1,Math.floor(width));height=Math.max(1,Math.floor(height));
 if(!finite(width)||!finite(height))throw new Error('Invalid runtime layout content size.');
 if(layout===undefined)return{x:Math.min(280,Math.floor(width*.3)),y:Math.min(36,height-1),width:width-Math.min(280,Math.floor(width*.3)),height:height-Math.min(36,height-1)};
 if(!viewportValid(layout?.viewport)||!finite(layout.left)||!finite(layout.top)||layout.left<0||layout.left>=layout.viewport.width||layout.top<0||layout.top>=layout.viewport.height)throw new Error('Invalid runtime layout.');
 const x=clamp(Math.ceil(layout.left*width/layout.viewport.width),width),y=clamp(Math.ceil(layout.top*height/layout.viewport.height),height);
 return{x,y,width:width-x,height:height-y};
}
