export function saveCompletion(start,current,snapshot) {
 if(start.path!==current.path||start.request!==current.request)return {apply:false};
 return {apply:true,dirty:current.content!==snapshot.content};
}
export function serializeActions() {
 let pending=Promise.resolve();
 return operation=>{const current=pending.catch(()=>{}).then(operation);pending=current;return current;};
}
