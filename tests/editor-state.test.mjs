import test from 'node:test';
import assert from 'node:assert/strict';
import {saveCompletion,serializeActions} from '../src/editor-state.mjs';
test('newer typing remains dirty when an older save completes',()=>{
 assert.deepEqual(saveCompletion({path:'A.md',request:1},{path:'A.md',request:1,content:'newer typing'},{content:'saved text'}),{apply:true,dirty:true});
});
test('a save completing after navigation cannot replace another active file',()=>{
 assert.deepEqual(saveCompletion({path:'A.md',request:1},{path:'B.md',request:2,content:'other file'},{content:'saved text'}),{apply:false});
});
test('unchanged editor content becomes clean after saving',()=>{
 assert.deepEqual(saveCompletion({path:'A.md',request:1},{path:'A.md',request:1,content:'saved text'},{content:'saved text'}),{apply:true,dirty:false});
});
test('rapid context mutations retain both passages even when the first host call is slow',async()=>{
 const run=serializeActions();let context=[];let release;const wait=new Promise(resolve=>release=resolve);
 const first=run(async()=>{const previous=context;await wait;context=[...previous,'first'];});
 const second=run(async()=>{context=[...context,'second'];});release();await Promise.all([first,second]);
 assert.deepEqual(context,['first','second']);
});
