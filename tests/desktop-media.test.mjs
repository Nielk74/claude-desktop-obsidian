import test from 'node:test';
import assert from 'node:assert/strict';
import {renderNote} from '../src/desktop/media.mjs';

const files=[{path:'Notes/Home.md'},{path:'Attachments/Product sketch.svg'},{path:'Notes/photo.png'},{path:'Attachments/diagram.png'}];

test('Obsidian image embeds retain dimensions and resolve through the registered vault file list',()=>{
 const result=renderNote('# A sketch\n\n![[Product sketch.svg|360]]','Notes/Home.md',files);
 assert.equal(result.embeds.length,1);
 assert.deepEqual(result.embeds[0],{path:'Attachments/Product sketch.svg',label:'Product sketch.svg',width:360});
 assert.match(result.html,/data-vault-image="0"/);
});

test('Markdown images resolve relative paths, encoded spaces, and parent directories',()=>{
 const result=renderNote('![Photo](photo.png)\n\n![Sketch](../Attachments/Product%20sketch.svg)\n\n![Diagram](/Attachments/diagram.png)','Notes/Home.md',files);
 assert.deepEqual(result.embeds.map(e=>e.path),['Notes/photo.png','Attachments/Product sketch.svg','Attachments/diagram.png']);
 assert.equal(result.embeds[0].label,'Photo');
});

test('code examples stay literal and image URLs cannot substitute arbitrary local paths',()=>{
 const result=renderNote('`![[photo.png]]`\n\n```md\n![[photo.png]]\n```\n\n![x](../../secret.png)\n\n![x](file:///C:/secret.png)\n\n![x](https://example.com/track.png)','Notes/Home.md',files);
 assert.deepEqual(result.embeds,[]);
 assert.doesNotMatch(result.html,/<img|src=/);
 assert.match(result.html,/External image/);
});

test('regular wikilinks and image aliases remain escaped and independent between render calls',()=>{
 const first=renderNote('[[Home|Read this]]\n\n![[photo.png|120x80]]','Notes/Home.md',files);
 assert.match(first.html,/https:\/\/atelier\.invalid\/note\?i=0/);
 assert.equal(first.embeds[0].height,80);
 const second=renderNote('![<bad>](missing.png)','Notes/Home.md',files);
 assert.equal(second.embeds.length,0);
 assert.doesNotMatch(second.html,/<bad>/);
});
