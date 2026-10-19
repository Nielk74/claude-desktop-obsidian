import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {notes, P, link as L} from './vault-content.mjs';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.join(project, 'Atelier Demo Vault');
const files = new Map();
const json = (name, value) => files.set(name, `${JSON.stringify(value, null, 2)}\n`);
for (const n of notes) {
  const properties = Object.entries(n.props).map(([k,v]) => `${k}: ${JSON.stringify(v)}`).join('\n');
  files.set(n.path, `---\n${properties}\n---\n\n${n.body}\n`);
}

// Canvas coordinates are deliberate, with separate lanes and roomy file cards.
function board() {
  const nodes=[],edges=[];
  const add = (id,type,x,y,width,height,extra={}) => (nodes.push({id,type,x,y,width,height,...extra}),id);
  return {
    data:{nodes,edges},
    group:(id,label,x,y,w,h,color)=>add(id,'group',x,y,w,h,{label,color}),
    text:(id,text,x,y,w,h,color)=>add(id,'text',x,y,w,h,{text,...(color?{color}:{})}),
    file:(id,key,x,y,w,h,extra={})=>add(id,'file',x,y,w,h,{file:P[key]??key,...extra}),
    url:(id,url,x,y,w,h)=>add(id,'link',x,y,w,h,{url}),
    edge:(id,from,to,label,fromSide='right',toSide='left',color)=>edges.push({id,fromNode:from,toNode:to,fromSide,toSide,toEnd:'arrow',...(label?{label}:{}),...(color?{color}:{})}),
  };
}

{
 const b=board();
 b.group('sources','01 / SOURCES',0,0,480,1050,'5');
 b.group('decisions','02 / WHAT WE LEARNED',570,0,520,1050,'6');
 b.group('workflow','03 / THE SMALL WORKFLOW',1180,0,480,1050,'4');
 b.group('next','04 / PROVE IT',1750,0,470,1050,'2');
 b.text('intro','# Claude × Obsidian\nA working space for the first useful integration.\n\n**Planning fixture · 19 October 2026**',-10,-260,820,170);
 b.text('principle','## Keep the scope small\nOne note → one useful passage → one saved answer.\n\nThe integration is proposed; this board is real.',1210,-260,930,170,'6');
 b.file('maya','interview1',30,65,420,350,{subpath:'#Observation'});
 b.file('theo','interview2',30,455,420,350,{subpath:'#Observation'});
 b.text('evidence','**Evidence note**\nInterviews and quotations are fictional sample data. Follow each card to its complete source note.',30,845,420,145,'5');
 b.text('find','## 1. Find the right note\nShow the filename **and** folder.\nSearch is recognition, not a memory test.',605,65,450,175,'6');
 b.text('choose','## 2. Choose context\nLet a person select a passage.\nKeep its source beside the text.',605,285,450,175,'6');
 b.text('trust','## 3. Trust the save\nShow the destination.\nDetect edits made in another application.',605,505,450,175,'6');
 b.file('canonical','adr',605,725,450,265,{subpath:'#Decision'});
 b.text('browse','### Browse\nFolders + search + a persistent breadcrumb.',1210,65,420,150,'4');
 b.text('read','### Read and select\nMarkdown note beside the conversation.\nSelect only what the task needs.',1210,265,420,175,'4');
 b.text('prompt','### Add to the prompt draft\nPreserve existing draft text.\nInclude the source note path.',1210,490,420,175,'4');
 b.text('save','### Save a useful answer\nCreate a note or append deliberately.\nKeep the conversation reference.',1210,715,420,175,'4');
 b.file('brief','scope',1780,65,410,350,{subpath:'#Success criteria'});
 b.file('todo','tasks',1780,455,410,300,{subpath:'#Next'});
 b.file('image','flow',1780,795,410,195);
 b.edge('e1','maya','find','folder context','right','left','5');
 b.edge('e2','maya','choose','selected excerpts','right','left','5');
 b.edge('e3','theo','trust','one trusted copy','right','left','5');
 b.edge('e4','trust','canonical','record the decision','bottom','top','6');
 b.edge('e5','find','browse','design response','right','left','6');
 b.edge('e6','choose','read','design response','right','left','6');
 b.edge('e7','browse','read','open','bottom','top','4');
 b.edge('e8','read','prompt','choose','bottom','top','4');
 b.edge('e9','prompt','save','continue the round trip','bottom','top','4');
 b.edge('e10','browse','brief','test retrieval','right','left','2');
 b.edge('e11','save','todo','implementation work','right','left','2');
 b.url('spec','https://jsoncanvas.org/spec/1.0/',0,1150,450,200);
 b.text('later','## Later, after the basics work\nEditable Canvas · graph navigation · semantic search\n\n'+L('roadmap','See the roadmap'),570,1150,1090,200);
 json(P.board,b.data);
}

{
 const b=board();
 b.group('work','PROJECTS / CURRENT COMMITMENTS',-700,-350,650,1190,'6');
 b.group('ideas','IDEAS / WHAT THE WORK TEACHES US',100,-350,650,1190,'5');
 b.group('people','PEOPLE / WHO IS INVOLVED',900,-350,600,1190,'4');
 b.text('title','# Atelier / studio map\nProjects are temporary. Good ideas connect them.\n\nFictional studio · real linked notes',-700,-600,1100,170);
 b.file('bridge','bridge',-660,-270,570,320);
 b.file('field','fieldnotes',-660,110,570,280);
 b.file('web','website',-660,450,570,280);
 b.file('local','local',140,-270,570,270);
 b.file('source','provenance',140,60,570,270);
 b.file('write','writing',140,390,570,270);
 b.file('maya','maya',940,-270,520,270);
 b.file('theo','theo',940,60,520,270);
 b.file('sofia','sofia',940,390,520,270);
 b.edge('s1','bridge','local','canonical vault','right','left','6');
 b.edge('s2','field','source','evidence','right','left','6');
 b.edge('s3','web','write','lesson','right','left','6');
 b.edge('s4','local','theo','implementation','right','left','5');
 b.edge('s5','source','maya','research','right','left','5');
 b.edge('s6','write','sofia','critique','right','left','5');
 b.text('reset','### Weekly reset\nChoose one outcome. Show unfinished work.\nKeep the next action small.\n\n'+L('weekly3','This week’s plan'),-660,930,570,220,'2');
 b.file('home','home',140,930,570,300,{subpath:'#On the desk · Monday, 19 October'});
 b.edge('s7','reset','home','return to the desk');
 json(P.map,b.data);
}

{
 const b=board();
 b.group('retrieval','FIND / RECOGNITION',0,0,580,980,'5');
 b.group('selection','CHOOSE / RELEVANCE',700,0,580,980,'6');
 b.group('confidence','TRUST / CONTINUITY',1400,0,580,980,'4');
 b.text('title','# Research wall\nTwo fictional interviews → three themes → one narrow brief.',0,-220,1200,130);
 b.text('q1','“I know I wrote it down. I just don’t remember what I called it.”\n\n— Maya · fictional interview',35,65,510,200,'5');
 b.file('source1','interview1',35,305,510,280,{subpath:'#Observation'});
 b.text('insight1','### Design implication\nShow the folder next to the note title.\nTest two notes with the same basename.',35,625,510,195);
 b.text('q2','Maya removed a paragraph before sending the prompt, then returned to check the source.\n\n— observed in fictional session',735,65,510,200,'6');
 b.file('source2','context',735,305,510,280);
 b.text('insight2','### Design implication\nAdd a selected passage, with a source, to the existing prompt draft.',735,625,510,195);
 b.text('q3','“If it saves somewhere, I need to know which copy I’m looking at.”\n\n— Theo · fictional interview',1435,65,510,200,'4');
 b.file('source3','interview2',1435,305,510,280,{subpath:'#Observation'});
 b.text('insight3','### Design implication\nKeep the vault canonical.\nMake the destination and conflict behavior explicit.',1435,625,510,195);
 for(const n of ['1','2','3']) {
   b.edge('r'+n,'q'+n,'source'+n,'trace the source','bottom','top');
   b.edge('i'+n,'source'+n,'insight'+n,'interpretation','bottom','top');
 }
 b.file('brief','scope',650,1110,680,370,{subpath:'#First milestone'});
 b.edge('b1','insight1','brief','narrow the brief','bottom','left','5');
 b.edge('b2','insight2','brief','narrow the brief','bottom','top','6');
 b.edge('b3','insight3','brief','narrow the brief','bottom','right','4');
 json(P.synthesisBoard,b.data);
}

// JSON is a valid YAML representation, so these are native .base documents.
json(P.projectBase,{
 filters:{and:['file.ext == "md"','note.type == "project"']},
 properties:{'file.name':{displayName:'Project'},'note.status':{displayName:'Status'},'note.due':{displayName:'Due'},'note.owner':{displayName:'Owner'},'note.priority':{displayName:'Priority'}},
 views:[
  {type:'table',name:'All projects',order:['file.name','note.status','note.priority','note.due','note.owner'],sort:[{property:'note.priority',direction:'ASC'}]},
  {type:'table',name:'Active',filters:{and:['note.status == "In progress"']},order:['file.name','note.due','note.owner']},
  {type:'table',name:'Archive',filters:{and:['note.status == "Archived"']},order:['file.name','note.status','note.due']},
 ],
});
json(P.readingBase,{
 filters:{and:['file.ext == "md"','note.type == "reading"']},
 properties:{'file.name':{displayName:'Reading'},'note.author':{displayName:'Author'},'note.status':{displayName:'State'},'note.progress':{displayName:'Progress (%)'}},
 views:[{type:'table',name:'Shelf',order:['file.name','note.author','note.status','note.progress']},{type:'table',name:'In progress',filters:{and:['note.status == "Reading"']},order:['file.name','note.progress']}],
});
json(P.meetingBase,{
 filters:{and:['file.ext == "md"','note.type == "meeting"']},
 properties:{'file.name':{displayName:'Meeting'},'note.date':{displayName:'Date'},'note.attendees':{displayName:'Attendees'}},
 views:[{type:'table',name:'Meeting log',order:['note.date','file.name','note.attendees'],sort:[{property:'note.date',direction:'DESC'}]}],
});

// Handmade SVG fixtures: actual image attachments without remote dependencies.
files.set(P.flow,`<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="360" viewBox="0 0 1000 360">
<rect width="1000" height="360" rx="20" fill="#191b25"/>
<g font-family="Segoe UI,Arial,sans-serif"><text x="42" y="54" fill="#edeaf8" font-size="24" font-weight="600">From a note to a useful answer</text><text x="42" y="82" fill="#a5a5bb" font-size="14">Atelier · integration workflow sketch · fictional project</text>
<g fill="#242735" stroke="#47415f" stroke-width="2"><rect x="40" y="125" width="260" height="120" rx="12"/><rect x="370" y="125" width="260" height="120" rx="12"/><rect x="700" y="125" width="260" height="120" rx="12"/></g>
<g fill="#ece8fa" font-size="20" font-weight="600"><text x="62" y="165">01 / Choose a passage</text><text x="392" y="165">02 / Draft in Claude</text><text x="722" y="165">03 / Save to the vault</text></g>
<g fill="#b7b5c9" font-size="15"><text x="62" y="197">Read the original Markdown note.</text><text x="62" y="222">Keep its source attached.</text><text x="392" y="197">Add the excerpt to the draft.</text><text x="392" y="222">Send when you are ready.</text><text x="722" y="197">Choose the destination.</text><text x="722" y="222">Preserve the conversation link.</text></g>
<g fill="none" stroke="#b6a1ee" stroke-width="3"><path d="M310 185H357m-9-8 9 8-9 8"/><path d="M640 185H687m-9-8 9 8-9 8"/><path d="M830 257V300H170V257"/></g><text x="358" y="328" fill="#b6a1ee" font-size="14">The vault remains the source of truth.</text></g></svg>\n`);
files.set(P.sketch,`<svg xmlns="http://www.w3.org/2000/svg" width="1100" height="660" viewBox="0 0 1100 660">
<rect width="1100" height="660" rx="18" fill="#16171e"/><g font-family="Segoe UI,Arial,sans-serif"><text x="36" y="44" fill="#f0edf7" font-size="22" font-weight="600">Panel interaction sketch</text><text x="36" y="70" fill="#9e9daf" font-size="13">Concept fixture, not a screenshot of an implemented integration</text>
<rect x="30" y="96" width="1040" height="530" rx="12" fill="#20212b" stroke="#3b3a4e"/>
<path d="M245 97V625M715 97V625" stroke="#3b3a4e"/>
<g fill="#a79abb" font-size="13"><text x="50" y="130">ATELIER VAULT</text><text x="265" y="130">01 Projects / Claude Obsidian</text><text x="738" y="130">CLAUDE / PROMPT DRAFT</text></g>
<rect x="45" y="151" width="184" height="34" rx="6" fill="#2b2b39"/><text x="57" y="173" fill="#bdb9cd" font-size="13">Search notes…</text>
<g fill="#c7c3d4" font-size="14"><text x="52" y="217">▾ 01 Projects</text><text x="66" y="249">▾ Claude Obsidian</text><text x="83" y="281">Product brief</text><text x="83" y="313" fill="#c9b6ff">Research synthesis</text><text x="83" y="345">Architecture</text><text x="66" y="391">▸ Fieldnotes</text><text x="52" y="433">▸ 03 Resources</text><text x="52" y="475">▸ 07 Canvases</text></g>
<text x="269" y="183" fill="#efeaf9" font-size="25" font-weight="600">Research synthesis</text><text x="269" y="218" fill="#9f9bac" font-size="13">type: synthesis   #research   #claude-obsidian</text>
<text x="269" y="267" fill="#e1dbed" font-size="19">Choose context deliberately</text><rect x="264" y="283" width="425" height="94" rx="5" fill="#46385f"/>
<g fill="#e0d6f2" font-size="15"><text x="279" y="310">The useful unit of context is often a passage,</text><text x="279" y="337">not a whole file. Keep the source beside it.</text><text x="279" y="364">Make the selection explicit.</text></g>
<rect x="270" y="403" width="181" height="39" rx="7" fill="#a88cde"/><text x="289" y="429" fill="#1c142b" font-size="14" font-weight="600">Add selection to chat</text>
<g fill="#9f9bac"><text x="269" y="488" font-size="14">Source: Interview - Maya · Observation</text><text x="269" y="587" font-size="13">Saved to the existing vault · conflict check on save</text></g>
<rect x="738" y="154" width="306" height="86" rx="8" fill="#2a2935"/><text x="755" y="182" fill="#d4c8e9" font-size="14">Research synthesis.md</text><text x="755" y="208" fill="#aaa2b8" font-size="13">Selected passage + source path</text>
<g fill="#cbc4d9" font-size="15"><text x="740" y="286">Use this observation to critique</text><text x="740" y="314">the note selection workflow.</text></g><path d="M739 338H1041" stroke="#494255"/>
<text x="740" y="388" fill="#a69aaf" font-size="13">Existing prompt text stays intact.</text><text x="740" y="412" fill="#a69aaf" font-size="13">Sending remains a separate action.</text>
<rect x="738" y="547" width="306" height="49" rx="7" fill="#32303f"/><text x="759" y="578" fill="#d5cbe5" font-size="14">Save a selected answer to Obsidian</text></g></svg>\n`);
files.set(P.handbook,'ATELIER / WORKING AGREEMENT\n\nFictional studio fixture, October 2026.\n\n1. Keep one current outcome visible.\n2. Link claims to their source.\n3. Show unfinished work on Wednesday.\n4. Leave the next action small enough to start.\n5. Treat research quotes in this demo as fictional.\n');

json('.obsidian/app.json',{
 alwaysUpdateLinks:true,newLinkFormat:'absolute',useMarkdownLinks:false,
 newFileLocation:'folder',newFileFolderPath:'00 Inbox',attachmentFolderPath:'09 Attachments',
 showLineNumber:false,readableLineLength:true,livePreview:true,defaultViewMode:'preview',
 propertiesInDocument:'visible',promptDelete:true,
});
json('.obsidian/appearance.json',{theme:'obsidian',accentColor:'#b69ae8',baseFontSize:16,enabledCssSnippets:['atelier']});
json('.obsidian/core-plugins.json',[
 'file-explorer','global-search','switcher','graph','backlink','outgoing-link','tag-pane','properties',
 'page-preview','daily-notes','templates','note-composer','command-palette','editor-status',
 'bookmarks','outline','word-count','file-recovery','canvas','bases',
]);
json('.obsidian/community-plugins.json',[]);
json('.obsidian/daily-notes.json',{folder:'05 Journal/Daily',template:'11 Templates/Daily note',format:'YYYY-MM-DD',autorun:false});
json('.obsidian/templates.json',{folder:'11 Templates',dateFormat:'YYYY-MM-DD',timeFormat:'HH:mm'});
json('.obsidian/graph.json',{
 'collapse-filter':false,search:'-path:"11 Templates"',showTags:true,showAttachments:false,
 hideUnresolved:true,showOrphans:false,'collapse-color-groups':false,
 colorGroups:[{query:'path:"01 Projects"',color:{a:1,rgb:11830301}},{query:'path:"03 Resources"',color:{a:1,rgb:7139789}},{query:'path:"04 People"',color:{a:1,rgb:8240531}},{query:'path:"05 Journal"',color:{a:1,rgb:15183217}}],
 'collapse-display':false,showArrow:false,textFadeMultiplier:0,nodeSizeMultiplier:1.2,lineSizeMultiplier:1,
 'collapse-forces':false,centerStrength:0.5,repelStrength:10,linkStrength:1,linkDistance:250,scale:0.8,
});
json('.obsidian/bookmarks.json',{items:[
 {type:'file',ctime:1792407600000,path:P.home,title:'Home / Atelier'},
 {type:'file',ctime:1792407600000,path:P.board,title:'Integration working canvas'},
 {type:'file',ctime:1792407600000,path:P.map,title:'Studio map'},
 {type:'file',ctime:1792407600000,path:P.projectBase,title:'Projects'},
 {type:'file',ctime:1792407600000,path:'05 Journal/Daily/2026-10-19.md',title:'Today'},
]});
json('.obsidian/types.json',{types:{created:'date',updated:'date',date:'date',due:'date',tags:'tags',aliases:'aliases',cssclasses:'multitext',attendees:'multitext',priority:'number',progress:'number',fictional:'checkbox'}});
const leaf = (id,type,state={},title,icon) => ({id,type:'leaf',state:{type,state,...(icon?{icon}:{}),...(title?{title}:{})}});
json('.obsidian/workspace.json',{
 main:{id:'atelier-main',type:'split',children:[{id:'atelier-tabs',type:'tabs',children:[
  leaf('atelier-home','markdown',{file:P.home,mode:'preview',source:false},'Home','lucide-file'),
  leaf('atelier-canvas','canvas',{file:P.board,viewState:{x:1100,y:520,zoom:-1.2}},'Claude Obsidian - working canvas','lucide-layout-dashboard'),
  leaf('atelier-projects','bases',{file:P.projectBase},'Projects','lucide-database'),
 ],currentTab:0}],direction:'vertical'},
 left:{id:'atelier-left',type:'split',children:[{id:'atelier-left-tabs',type:'tabs',children:[leaf('atelier-files','file-explorer',{sortOrder:'alphabetical'}),leaf('atelier-search','search',{query:'',matchingCase:false,explainSearch:false,collapseAll:false,extraContext:false,sortOrder:'alphabetical'}),leaf('atelier-bookmarks','bookmarks',{})],currentTab:0}],direction:'horizontal',width:260},
 right:{id:'atelier-right',type:'split',children:[{id:'atelier-right-tabs',type:'tabs',children:[leaf('atelier-backlinks','backlink',{file:P.home,collapseAll:false,extraContext:false,sortOrder:'alphabetical',showSearch:false,searchQuery:'',backlinkCollapsed:false,unlinkedCollapsed:true}),leaf('atelier-outline','outline',{file:P.home})],currentTab:0}],direction:'horizontal',width:270,collapsed:true},
 active:'atelier-home',lastOpenFiles:[P.board,P.map,P.projectBase,P.bridge,P.research,P.synthesisBoard,'05 Journal/Daily/2026-10-19.md',P.home],
});
files.set('.obsidian/snippets/atelier.css',`/* Gentle local styling; no community theme dependency. */
.atelier-home { --file-line-width: 900px; }
.atelier-home .markdown-preview-view h1 { font-size: 2.8em; letter-spacing: -.04em; }
.atelier-home .markdown-preview-view h2 { margin-top: 1.8em; }
.atelier-home .callout[data-callout="focus"] { --callout-color: 182,154,232; --callout-icon: lucide-focus; }
.atelier-home .markdown-preview-view table { width: 100%; }
.canvas-node-container .markdown-preview-view { font-size: 16px; }
`);

// Refuse to overwrite an existing vault; this generator is for a fresh fixture.
try { await fs.access(root); throw new Error(`Vault already exists: ${root}. Preserve it; choose another destination before regenerating.`); }
catch(e) { if(e.code!=='ENOENT') throw e; }
for (const [name,body] of files) {
 const target=path.resolve(root,name);
 if(!target.startsWith(root+path.sep)) throw new Error('Path escaped vault: '+name);
 await fs.mkdir(path.dirname(target),{recursive:true});
 await fs.writeFile(target,body,{encoding:'utf8',flag:'wx'});
}
const counts={notes:notes.length,canvases:3,bases:3,attachments:3,files:files.size};
await fs.writeFile(path.join(project,'demo-vault.json'),JSON.stringify({name:'Atelier Demo Vault',path:root,home:P.home,canvas:P.board,fictional:true,...counts},null,2)+'\n','utf8');
console.log(JSON.stringify({root,...counts},null,2));
