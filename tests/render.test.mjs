import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveNoteLink,canvasLayout,sourceExcerpt,prepareMarkdown} from '../src/render.mjs';
import {Marked} from 'marked';
const files=[{path:'Project/Notes.md'},{path:'Other/Notes.md'},{path:'Écrire.md'},{path:'Board.canvas'}];
test('wikilinks preserve folders, heading anchors, and display aliases',()=>{
 assert.deepEqual(resolveNoteLink('Project/Notes#Observation|Evidence','Home.md',files),{path:'Project/Notes.md',anchor:'Observation',label:'Evidence',missing:false});
 assert.equal(resolveNoteLink('Notes','Home.md',files).missing,true);
 assert.equal(resolveNoteLink('Notes','Project/Home.md',files).path,'Project/Notes.md');
 assert.equal(resolveNoteLink('Écrire','Home.md',files).path,'Écrire.md');
});
test('Canvas layout retains negative coordinates and derives nonzero fit bounds',()=>{
 assert.deepEqual(canvasLayout([{x:-100,y:-50,width:300,height:200},{x:400,y:100,width:100,height:100}]),{x:-140,y:-90,width:680,height:330});
 assert.deepEqual(canvasLayout([]),{x:0,y:0,width:800,height:500});
});
test('chat excerpts retain the source and never silently truncate a selection',()=>{
 assert.equal(sourceExcerpt('Project/Notes.md','Chosen words'),'Source: Project/Notes.md\n\nChosen words');
 assert.throws(()=>sourceExcerpt('Home.md','x'.repeat(20001)),/20,000/);
});
test('aliased wikilinks do not split Markdown tables into extra cells',()=>{
 const tokens=new Marked().lexer(prepareMarkdown('| Project | State |\n| --- | --- |\n| [[Project/Notes|Evidence]] | Active |'));
 assert.equal(tokens[0].rows[0].length,2);
 assert.equal(tokens[0].rows[0][0].text,'[[Project/Notes|Evidence]]');
 assert.equal(tokens[0].rows[0][1].text,'Active');
});
