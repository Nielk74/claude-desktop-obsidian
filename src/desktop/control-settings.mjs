const style=`:host{display:block;color:inherit;font:14px Segoe UI,system-ui}.row{display:flex;align-items:center;justify-content:space-between;gap:24px;padding:18px 0;border-bottom:1px solid #8883}label{font-weight:600}small{display:block;font-size:12px;font-weight:400;line-height:1.5;opacity:.65;margin-top:4px}select{font:inherit;color:inherit;background:var(--color-background-secondary,#262626);border:1px solid #8886;border-radius:8px;padding:8px 32px 8px 12px;min-width:130px;color-scheme:dark light;cursor:pointer}select:focus-visible{outline:2px solid #b392e8;outline-offset:2px}select:disabled{opacity:.5;cursor:wait}p{margin:6px 0 0;min-height:18px;font-size:12px;opacity:.7}`;

export function createControlSettings(document,request,{onOpen=()=>{}}={}){
 const rows=new Set();let controls=null,busy=false,message='',dialog,nativePanel;
 const node=(tag,text)=>{const element=document.createElement(tag);if(text)element.textContent=text;return element;};
 function render(){for(const row of rows){if(!row.host.isConnected){rows.delete(row);continue;}row.select.value=controls??'minimal';row.select.disabled=busy||!controls;row.status.textContent=message;}}
 async function invoke(payload){const response=await request(payload);if(!response?.ok)throw new Error(response?.message??'Obsidian settings did not respond.');if(!['minimal','all'].includes(response.value?.controls))throw new Error('Obsidian returned an invalid controls setting.');return response.value.controls;}
 async function load(){if(busy)return;busy=true;message='Loading…';render();try{controls=await invoke({action:'runtime.preferences.get'});message='';}catch(error){message=error.message;}finally{busy=false;render();}}
 async function save(value){if(busy)return;busy=true;message='Saving…';render();try{controls=await invoke({action:'runtime.preferences.set',args:{controls:value}});message='Saved';}catch(error){message=error.message;}finally{busy=false;render();}}
 function mount(parent){
  if(parent.querySelector('[data-atelier-control-settings]'))return false;
  const host=node('div');host.dataset.atelierControlSettings='';const shadow=host.attachShadow({mode:'open'}),css=node('style',style),row=node('div');row.className='row';
  const label=node('label','Obsidian controls'),description=node('small','Choose how many controls appear inside embedded Obsidian.');label.htmlFor='controls';label.append(description);
  const select=node('select');select.id='controls';select.setAttribute('aria-label','Obsidian controls');select.setAttribute('aria-describedby','status');
  for(const [value,title]of [['minimal','Minimal'],['all','All']]){const option=node('option',title);option.value=value;select.append(option);}
  select.onchange=()=>save(select.value);const status=node('p');status.id='status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');row.append(label,select);shadow.append(css,row,status);parent.prepend(host);rows.add({host,select,status});render();void load();return true;
 }
 function attach(){
  const selector='[data-perf-region="settings_panel"] .settings-panel-plain-rows, [role="dialog"]:has([data-perf-region="settings_nav"]) .settings-panel-plain-rows';
  const panel=[...document.querySelectorAll(selector)].find(element=>!element.getClientRects||element.getClientRects().length>0);
  const opening=panel!==nativePanel;nativePanel=panel;
  if(panel){const missing=!panel.querySelector('[data-atelier-control-settings]');if(opening||missing)onOpen();const mounted=mount(panel);if(opening&&!mounted)void load();}
 }
 function open(){
  onOpen();
  if(!dialog){
   dialog=node('dialog');dialog.setAttribute('aria-label','Obsidian settings');dialog.style.cssText='color:inherit;background:var(--color-background-primary,#202020);border:1px solid #8885;border-radius:16px;padding:24px;width:min(440px,calc(100vw - 80px));font:14px Segoe UI,system-ui;box-shadow:0 18px 80px #0006';
   const heading=node('h2','Obsidian settings');heading.style.cssText='font-size:18px;margin:0 0 8px';const content=node('div'),close=node('button','Done');close.style.cssText='float:right;margin-top:16px;border:1px solid #8886;border-radius:8px;padding:8px 18px;font:inherit;color:inherit;background:transparent;cursor:pointer';close.onclick=()=>dialog.close();dialog.append(heading,content,close);document.body.append(dialog);mount(content);
  }
  if(!dialog.open)dialog.showModal();void load();
 }
 return{attach,open};
}
