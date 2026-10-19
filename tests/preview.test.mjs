import test from 'node:test';
import assert from 'node:assert/strict';
import {createPreview} from '../scripts/preview.mjs';
import path from 'node:path';

test('local preview requires a page token and rejects cross-origin vault access',async t=>{
 const server=await createPreview(path.resolve('Atelier Demo Vault'));
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
 const origin='http://127.0.0.1:'+server.address().port;
 const page=await fetch(origin+'/preview');const html=await page.text();
 const token=html.match(/name="preview-token" content="([a-f0-9]+)"/)[1];
 assert.equal((await fetch(origin+'/api/vault_list',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,403);
 const headers={'Content-Type':'application/json',Authorization:'Bearer '+token};
 assert.equal((await fetch(origin+'/api/vault_list',{method:'POST',headers:{...headers,Origin:'https://example.com'},body:'{}'})).status,403);
 const response=await fetch(origin+'/api/vault_read',{method:'POST',headers,body:JSON.stringify({path:'Home.md'})});
 assert.match((await response.json()).content,/# Atelier/);
 assert.equal(page.headers.get('x-frame-options'),'DENY');
});
