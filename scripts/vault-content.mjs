// Fictional, internally consistent content for the Obsidian integration fixture.
export const P = {
  home: 'Home.md', guide: 'Start here.md', inbox: '00 Inbox/Capture.md',
  bridge: '01 Projects/Claude Obsidian/Claude Obsidian.md',
  scope: '01 Projects/Claude Obsidian/Product brief.md',
  roadmap: '01 Projects/Claude Obsidian/Roadmap.md',
  tasks: '01 Projects/Claude Obsidian/Task board.md',
  architecture: '01 Projects/Claude Obsidian/Architecture.md',
  adr: '01 Projects/Claude Obsidian/Decisions/001 - Keep the vault canonical.md',
  research: '01 Projects/Claude Obsidian/Research/Research synthesis.md',
  interview1: '01 Projects/Claude Obsidian/Research/Interview - Maya.md',
  interview2: '01 Projects/Claude Obsidian/Research/Interview - Theo.md',
  bridgeNotes: '01 Projects/Claude Obsidian/Research/Notes.md',
  fieldnotes: '01 Projects/Fieldnotes/Fieldnotes.md',
  fieldNotes: '01 Projects/Fieldnotes/Research/Notes.md',
  website: '01 Projects/Studio website/Studio website.md',
  websiteRetro: '01 Projects/Studio website/Launch retrospective.md',
  studio: '02 Areas/Studio operations.md', systems: '02 Areas/Personal systems.md',
  learning: '02 Areas/Learning and craft.md',
  local: '03 Resources/Concepts/Local first software.md',
  provenance: '03 Resources/Concepts/Source provenance.md',
  progressive: '03 Resources/Concepts/Progressive disclosure.md',
  atomic: '03 Resources/Concepts/Atomic notes.md',
  wikilinks: '03 Resources/Concepts/Wikilinks and backlinks.md',
  canvas: '03 Resources/Concepts/Thinking on a canvas.md',
  context: '03 Resources/Concepts/Context is a working set.md',
  writing: '03 Resources/Concepts/Writing is thinking.md',
  reading1: '03 Resources/Reading/A Philosophy of Software Design.md',
  reading2: '03 Resources/Reading/The Design of Everyday Things.md',
  reading3: '03 Resources/Reading/Working notes on JSON Canvas.md',
  maya: '04 People/Maya Chen.md', theo: '04 People/Theo Martin.md',
  sofia: '04 People/Sofia Laurent.md',
  kickoff: '06 Meetings/2026-10-05 - Integration kickoff.md',
  researchReview: '06 Meetings/2026-10-12 - Research review.md',
  designReview: '06 Meetings/2026-10-15 - Panel design critique.md',
  planning: '06 Meetings/2026-10-19 - Weekly planning.md',
  weekly1: '05 Journal/Weekly/2026-W41.md',
  weekly2: '05 Journal/Weekly/2026-W42.md',
  weekly3: '05 Journal/Weekly/2026-W43.md',
  archive: '10 Archive/Meridian - archived project.md',
  map: '07 Canvases/Studio map.canvas',
  board: '07 Canvases/Claude Obsidian - working canvas.canvas',
  synthesisBoard: '07 Canvases/Research wall.canvas',
  projectBase: '08 Views/Projects.base', readingBase: '08 Views/Reading.base',
  meetingBase: '08 Views/Meetings.base',
  flow: '09 Attachments/Note to conversation.svg',
  sketch: '09 Attachments/Panel sketch.svg',
  handbook: '09 Attachments/Atelier working agreement.txt',
};

export const link = (key, label) => {
  const p = P[key] ?? key;
  const title = label ?? p.split('/').at(-1).replace(/\.(md|canvas|base|svg|txt)$/, '');
  return `[[${p.replace(/\.md$/, '')}|${title}]]`;
};
const L = link;
export const notes = [];
function note(key, props, body) {
  notes.push({path: P[key] ?? key, props: {created: '2026-10-05', updated: '2026-10-19', ...props}, body: body.trim()});
}

note('home', {type: 'dashboard', aliases: ['Atelier', 'Studio home'], cssclasses: ['atelier-home'], tags: ['home']}, `
# Atelier
**A small studio, many connected ideas.**

> [!info] Demo workspace
> This is a fictional working vault made for the Claude Desktop integration. People, interviews, dates, and project activity are sample data. The files are real and editable.

## On the desk · Monday, 19 October
The focus this week is ${L('bridge')}: make it possible to move between a conversation and a trusted note without losing either thread.

> [!focus] This week's outcome
> Browse a note, bring a passage into a draft prompt, and save a useful answer back with its source. See ${L('weekly3', 'this week’s plan')}.

| Project | State | Next move |
| --- | --- | --- |
| ${L('bridge')} | In progress | Validate the first panel workflow |
| ${L('fieldnotes')} | Paused | Wait for the integration research |
| ${L('website')} | Done | Apply the launch lessons |

## Work visually
- ${L('board', 'Integration working canvas')} — sources, decisions, workflow, next steps.
- ${L('synthesisBoard', 'Research wall')} — interview evidence grouped into three themes.
- ${L('map', 'Studio map')} — how the projects, people, and ideas connect.

## Find your bearings
${L('inbox', 'Inbox')} · ${L('projectBase', 'Project database')} · ${L('readingBase', 'Reading shelf')} · ${L('meetingBase', 'Meeting log')}

${L('studio')} · ${L('systems')} · ${L('learning')}

## Recent threads
- ${L('planning')} — protect the narrow first milestone.
- ${L('designReview')} — the note’s location needs to stay visible.
- ${L('adr')} — files remain the source of truth.
- ${L('research')} — selecting context is more important than adding more context.

## Today
![[05 Journal/Daily/2026-10-19#Top three]]

New here? ${L('guide', 'Take the five-minute tour')}.
`);

note('guide', {type: 'guide', tags: ['meta', 'demo']}, `
# Start here
This vault belongs to a fictional product studio called Atelier. Its current project is an Obsidian notes panel for Claude Desktop. The content describes a plausible planning stage; it does **not** claim the integration is already implemented.

## Five-minute tour
1. Open ${L('home')} for the current focus.
2. Open ${L('board')} and use Zoom to fit to explore the whole board.
3. Follow ${L('research')} to the original interview notes.
4. Open ${L('projectBase')} to sort projects by status and due date.
5. Try ${L('bridgeNotes', 'the integration research Notes')} and ${L('fieldNotes', 'the Fieldnotes research Notes')}: their basenames match, but their folders and links are distinct.

## What is included
Linked project briefs, a task board, daily and weekly notes, meeting minutes, people, evergreen concepts, reading notes, reusable templates, three native Canvas files, three native Bases views, SVG attachments, and bookmarks. Everything uses core Obsidian features; community plugins are not required.

## Useful integration examples
- Search **canonical** or **context** to find ideas across several folders.
- Follow a heading link: [[01 Projects/Claude Obsidian/Product brief#Success criteria|success criteria]].
- Follow a block reference: [[01 Projects/Claude Obsidian/Research/Interview - Maya#^maya-retrieval|Maya’s retrieval observation]].
- Read a passage, include it in a draft prompt, then save a response as a new note.
- Edit an existing note in another editor to test change detection.

## Content conventions
Dates use Europe/Paris. All sample activity stops at 19 October 2026. People and business details are fictional. Public links in reading notes are actual reference links, while interview quotes are fabricated demonstration material.

The folders roughly follow projects, areas, resources, and archives. Prefer folder-qualified links so duplicate filenames remain unambiguous. See ${L('wikilinks')}.
`);

note('inbox', {type: 'inbox', tags: ['inbox']}, `
# Capture
Unprocessed observations, not commitments. Review during ${L('systems', 'the Friday reset')}.

## 19 October
- Would a keyboard shortcut for “use this paragraph” be more useful than another toolbar button? Bring to ${L('designReview', 'the next critique')}.
- The ${L('board', 'working canvas')} should be a useful test for embedded file previews.
- ${L('sofia')} suggested testing a note title with an accent: see [[03 Resources/Concepts/Écrire pour comprendre]].

## 16 October
- Keep a breadcrumb visible while searching inside a folder.
- Is “saved” enough feedback when another app has modified the file? Related: ${L('architecture')}.

## Processed
- [x] Turn “context should be chosen” into ${L('context')}.
- [x] Move archive restoration idea into ${L('roadmap')}.
- [ ] Decide whether a Canvas text card can be selected as prompt context.
`);

note('bridge', {type: 'project', status: 'In progress', priority: 1, due: '2026-11-02', owner: L('theo'), tags: ['project', 'claude-obsidian'], aliases: ['Obsidian integration']}, `
# Claude Obsidian
An Obsidian vault panel next to a Claude Desktop conversation. The immediate need is simple: read the note I already have, use only the useful part, and keep the result somewhere I can find it again.

## Current state
Research and interaction design are ready for a small technical prototype. The panel and desktop installation path still need implementation and validation. ${L('scope')} defines the first milestone; ${L('tasks')} records the work.

## Working set
- ${L('research')} and ${L('synthesisBoard')} — why this is useful.
- ${L('architecture')} and ${L('adr')} — proposed implementation boundaries.
- ${L('roadmap')} — sequence and dates.
- ${L('board')} — the project as a visual workspace.

## Open questions
1. Which supported or custom desktop surface can host the panel in regular Chat?
2. How should unsaved changes be handled if the same note changes in Obsidian?
3. Can the first version preserve a stable source reference when saving a response?

## Next review
Wednesday 21 October with ${L('maya')} and ${L('theo')}. Test the note-to-prompt journey before polishing the panel. Related: ${L('planning')}.
`);

note('scope', {type: 'brief', project: L('bridge'), status: 'Draft', tags: ['product', 'scope']}, `
# Product brief
## Problem
Research and decisions live in Obsidian; drafting happens in Claude. Moving between them repeatedly breaks concentration and leaves answers stranded in chat history.

## First milestone
- Browse a vault using folders and a quick search.
- Read and edit a Markdown note beside the conversation.
- Add a selected passage to the prompt draft with its filename.
- Save a selected answer to a new note or append it to an existing note.

## Success criteria
- A participant finds the requested interview note in under 20 seconds.
- Adding a passage leaves the existing prompt draft intact.
- A saved note contains the original answer, a source field, and a timestamp.
- An external edit is detected before an older editor buffer can overwrite it.
- Notes remain readable and editable in normal Obsidian.

## Later
Canvas editing, bulk operations, graph-based suggestions, and semantic search can follow after the basic note workflow works. Canvas **reading and file recognition** belong in the compatibility check now.

## Evidence
${L('interview1')} describes retrieval friction; ${L('interview2')} describes the cost of duplicated notes. ${L('provenance')} explains why the source should travel with the excerpt.
`);

note('roadmap', {type: 'plan', project: L('bridge'), tags: ['planning']}, `
# Roadmap
| Window | Outcome | Exit condition |
| --- | --- | --- |
| 5–12 October | Understand the workflow | Two interviews and a research synthesis |
| 13–19 October | Agree a narrow prototype | Product brief, panel critique, architecture note |
| 20–23 October | Prove the desktop surface | A real vault note renders inside Claude Desktop |
| 26–30 October | Connect the round trip | Passage to prompt; response back to vault |
| 2 November | Review the prototype | Run the five success checks in the brief |

## Deferred ideas
- Editable Canvas nodes and edges.
- A combined graph of conversations and notes.
- Restoring a previous research workspace.
- Full-text search inside binary attachments.

## Dependencies
${L('architecture')} must validate the desktop surface before we commit to a renderer. ${L('maya')} owns the usability check. ${L('theo')} owns the file conflict behavior.

The milestone dates are fictional planning fixtures, not a delivery promise. See ${L('scope')}.
`);

note('tasks', {type: 'task-board', project: L('bridge'), tags: ['tasks']}, `
# Task board
## Doing
- [ ] Validate a regular Chat panel mounting point — Theo · 21 October.
- [ ] Exercise the fixture vault against filename, Unicode, Canvas, and attachment cases.

## Next
- [ ] Implement the folder tree and search input.
- [ ] Preserve the draft when adding a selected note passage.
- [ ] Compare the on-disk version before saving an edited note.
- [ ] Add a source link when saving an answer.
- [ ] Test empty, disconnected, and missing-note states.

## Done
- [x] Capture two interview sessions.
- [x] Write ${L('research')}.
- [x] Review ${L('sketch', 'the panel sketch')}.
- [x] Record ${L('adr', 'the canonical-vault decision')}.

## Review notes
A task is finished when it can be demonstrated with a real note, not when its button exists. Track the interaction against ${L('scope', 'the brief')}.
`);

note('architecture', {type: 'technical-note', project: L('bridge'), status: 'Proposed', tags: ['architecture']}, `
# Architecture
## Proposed shape
The panel owns navigation, a Markdown view, and a prompt insertion action. A small local bridge owns vault reads and writes. The existing Obsidian Local REST API is one candidate; its compatibility must be verified against the installed versions.

![[09 Attachments/Note to conversation.svg]]

## Boundaries
The vault remains the canonical store. Selecting a note does not itself send it to a model. “Add to chat” explicitly places the selected text in the prompt draft; sending that prompt is a separate action.

## Concurrent changes
Record the source version when opening a note. Before saving, compare against the current file version. If it changed, show both versions and let the user choose what to keep. Never silently replace an external change.

## Compatibility cases
Folder-qualified links, accented filenames, heading and block references, SVG attachments, Markdown tables, YAML properties, Canvas files, and Bases files. The fixtures include all of these. The two Research/Notes.md files intentionally test basename collisions.

## Technical uncertainty
The official Claude Code mod UI targets the Code tab. A panel in regular Chat needs a separate desktop modification. This note records a proposal, not a verified installation.

Decision: ${L('adr')}. Interaction: ${L('scope')}.
`);

note('adr', {type: 'decision', status: 'Accepted', project: L('bridge'), date: '2026-10-14', tags: ['decision', 'local-first']}, `
# 001 · Keep the vault canonical
## Context
We considered copying notes into a separate application database so the panel could search them independently. That creates two places where a note can be edited and makes “which version is current?” harder to answer.

## Decision
Obsidian’s vault files remain the source of truth. Any search index is disposable. The panel keeps temporary editing state, checks for external modifications, and writes only to the chosen vault.

## Consequences
- A saved note is immediately useful outside the integration.
- We need explicit conflict behavior rather than assuming a single editor.
- Moving or renaming notes must preserve the user’s existing links.
- An index may improve retrieval later, but must be rebuildable from files.

Accepted in the fictional planning session with ${L('theo')} and ${L('maya')}. See ${L('local')} and ${L('interview2')}.
`);

note('interview1', {type: 'interview', date: '2026-10-08', participant: L('maya'), project: L('bridge'), tags: ['research', 'interview']}, `
# Interview · Maya
**Scenario:** prepare a product review using notes from three earlier conversations. Duration: 28 minutes. This interview and its quotations are fictional demo material.

## Observation
Maya remembered the idea but not the note title. She searched a broad term, opened four plausible notes, and used the folder breadcrumb to distinguish them.

> “I know I wrote it down. I just don’t remember what I called it.” ^maya-retrieval

She copied two paragraphs into a prompt, removed one, and then returned to the note to check who had said it. The missing source mattered more than the extra click.

## Interpretation
Search results should show both filename and folder. An excerpt needs a source label by default. The interface should support deliberate selection rather than always adding the whole note.

## Follow-up
- [x] Add the duplicate-basename case to the fixture plan.
- [ ] Test retrieval with the panel in a narrow window.

Contributes to ${L('research')} and ${L('provenance')}.
`);

note('interview2', {type: 'interview', date: '2026-10-09', participant: L('theo'), project: L('bridge'), tags: ['research', 'interview']}, `
# Interview · Theo
**Scenario:** update an implementation note while reviewing an answer in chat. Duration: 31 minutes. Fictional interview data.

## Observation
Theo had pasted the same architecture explanation into a note and a separate project document. Both were edited during the session. He only noticed the disagreement when a filename no longer matched.

> “If it saves somewhere, I need to know which copy I’m looking at.”

He wanted a save action that showed its destination and kept the source conversation nearby. He did not ask for automatic rewrites of the entire vault.

## Interpretation
Make the destination visible before writing. A new answer can become a new note or a clearly marked append. Existing notes need an external-change check.

## Follow-up
- [x] Write ${L('adr')}.
- [ ] Demonstrate one conflict in the prototype review.

Related: ${L('architecture')} and ${L('context')}.
`);

note('research', {type: 'synthesis', project: L('bridge'), tags: ['research', 'synthesis']}, `
# Research synthesis
## Three themes
### Find the right note
Titles alone are insufficient when work spans several projects. Folder context is part of recognition. Evidence: ${L('interview1')}.

### Choose context deliberately
Participants edited copied material before sending it. The unit of context is often a passage, not a file. This became ${L('context')}.

### Trust where work is saved
Saving should reduce ambiguity. A second unmanaged copy does the opposite. Evidence: ${L('interview2')}; decision: ${L('adr')}.

## Design implications
| Observation | Proposed response | Check |
| --- | --- | --- |
| Duplicate note titles | Show the folder breadcrumb | Find the correct Research/Notes.md |
| Excerpts lose their source | Insert source label with the passage | Trace a quotation to its note |
| Two editors can disagree | Detect external changes | Edit a note in Obsidian while open in panel |

## Confidence
These are directional findings from two fictional interviews, not validated research. They make the demo feel coherent and provide realistic test scenarios. Actual users must validate the workflow.

See ${L('synthesisBoard', 'the research wall')} for the visual version.
`);

note('bridgeNotes', {type: 'working-note', project: L('bridge'), tags: ['research', 'rough']}, `
# Notes
Integration-specific scratchpad. This is intentionally not the same file as ${L('fieldNotes', 'Fieldnotes / Research / Notes')}.

- Search results need to keep folder paths readable at small widths.
- A note’s YAML block should not crowd the excerpt preview.
- Test a heading link and a block link separately.
- Canvas files should appear with their own icon, not as unreadable JSON.

Question for ${L('theo')}: can the bridge expose a file version for conflict detection? If not, compare a content hash. Bring the result to ${L('architecture')}.
`);

note('fieldnotes', {type: 'project', status: 'Paused', priority: 2, due: '2026-11-16', owner: L('maya'), tags: ['project', 'fieldnotes']}, `
# Fieldnotes
A lightweight research library for turning raw interview notes into reusable evidence. The initial direction was a separate app. We paused it after noticing that most source material already lives in Obsidian.

## Why paused
${L('bridge')} may solve enough of the retrieval problem without asking people to migrate their notes. Validate that smaller workflow first.

## What remains useful
- The evidence-to-claim model in ${L('provenance')}.
- The tag hygiene observations in ${L('fieldNotes')}.
- Maya’s interview facilitation checklist in ${L('maya')}.

## Restart trigger
Revisit after the integration prototype review on 2 November. If sources remain hard to trace across several projects, test a focused evidence index rather than a whole new editor.
`);

note('fieldNotes', {type: 'working-note', project: L('fieldnotes'), tags: ['research', 'rough']}, `
# Notes
Fieldnotes research scratchpad. Folder-qualified links distinguish this from ${L('bridgeNotes', 'the integration scratchpad')}.

## Tag hygiene
People consistently remember a project or person, but tags drift between singular and plural. Use tags for a small set of stable concepts and links for entities.

## Evidence cards
A useful evidence card needs a claim, the original excerpt, and a source. It should also show whether the claim is an observation or an interpretation.

## Parking lot
- [ ] Evaluate whether a Canvas wall already supports the synthesis workflow.
- [ ] Compare a file-based source index with a database-backed one.

Related: ${L('atomic')} and ${L('provenance')}.
`);

note('website', {type: 'project', status: 'Done', priority: 3, due: '2026-10-02', created: '2026-09-14', updated: '2026-10-06', owner: L('sofia'), tags: ['project', 'website']}, `
# Studio website
The studio’s small portfolio refresh shipped on 2 October. The goal was a clear introduction, two substantial case studies, and a simple way to start a conversation.

## Delivered
- [x] Rewrite the introduction around outcomes.
- [x] Publish two fictional case studies in the demo plan.
- [x] Audit heading order, focus states, and small-screen navigation.
- [x] Remove an unnecessary animation from the project index.

## What changed
The final design used less decoration and more useful project detail. ${L('sofia')} kept the visual system restrained. ${L('websiteRetro')} records the tradeoffs.

## Next maintenance
Review project descriptions at the end of October. No further redesign is scheduled.
`);

note('websiteRetro', {type: 'retrospective', project: L('website'), date: '2026-10-06', tags: ['reflection']}, `
# Launch retrospective
## Worked
Writing the case study before drawing the layout exposed gaps in the story early. The design critique was faster once everyone could react to real content.

## Did not work
We spent an afternoon refining an animation before deciding what information the project cards needed. That sequence created avoidable rework.

## Keep
- Content before decorative motion.
- One primary action per page.
- Check the narrow layout during the first critique.

## Carry forward
For ${L('bridge')}, use real notes in the first panel sketch. A plausible vault will reveal issues that three empty placeholder cards cannot. This connects to ${L('progressive')} and ${L('writing')}.
`);

note('studio', {type: 'area', tags: ['area', 'studio']}, `
# Studio operations
## Weekly rhythm
Monday: choose one outcome. Wednesday: show unfinished work. Friday: clean the inbox and record what changed.

## Current commitments
${L('bridge')} gets the first uninterrupted work block. ${L('fieldnotes')} stays paused. ${L('website')} receives maintenance only.

## Working agreements
![[09 Attachments/Atelier working agreement.txt]]

## People
${L('maya')} — research. ${L('theo')} — implementation. ${L('sofia')} — design critique.

See ${L('weekly3')} and ${L('planning')} for the current week.
`);

note('systems', {type: 'area', tags: ['area', 'personal']}, `
# Personal systems
The vault is a place to think with a few reliable habits, not an obligation to catalogue everything.

## Daily
Start with three concrete outcomes. Capture interruptions in ${L('inbox')}. Finish with one sentence about what changed.

## Friday reset
- [ ] Process the inbox into projects, concepts, or the archive.
- [ ] Close completed actions and move the unfinished ones deliberately.
- [ ] Write a weekly review with links to the actual work.
- [ ] Keep the next Monday’s first action small enough to start.

## Note-making
Promote an idea into ${L('atomic', 'an evergreen note')} when it has a useful claim and can stand on its own. Link it back to the project that produced it.
`);

note('learning', {type: 'area', tags: ['area', 'learning']}, `
# Learning and craft
## Current question
How do we make tools that keep a person oriented while the underlying material gets more complex?

## Active threads
- ${L('progressive')} — reveal useful detail at the point of need.
- ${L('context')} — a working set should be chosen.
- ${L('canvas')} — spatial arrangement makes relations visible.

## Reading shelf
![[08 Views/Reading.base]]

Keep short reading notes with a concrete connection to current work. A summary without a question is easy to forget.
`);

const concepts = [
  ['local', ['local-first', 'architecture'], 'Local first software', 'A local file is useful even when an integration disappears.', `The integration should improve access to the vault while preserving the ordinary usefulness of its files. The canonical-store decision in ${L('adr')} is a practical consequence.\n\nLocal storage does not imply that text sent to a hosted model stays on the device. “Add to chat” needs to make that boundary understandable. Related: ${L('context')}.`],
  ['provenance', ['research', 'knowledge'], 'Source provenance', 'A reusable claim needs a path back to its evidence.', `An excerpt loses value when its origin disappears. Store the note path, section when available, and capture time beside the selected text.\n\nThe same principle applies in the other direction: an answer saved to a note benefits from a conversation reference. See ${L('interview1')} and ${L('fieldnotes')}.`],
  ['progressive', ['design', 'interaction'], 'Progressive disclosure', 'Show enough to make the next decision, then reveal detail when it helps.', `A search result needs a title, a folder, and a short excerpt. It rarely needs every property at once. Opening the note can reveal the full document.\n\nThis is the key critique in ${L('designReview')}. Related reading: ${L('reading2')}.`],
  ['atomic', ['knowledge', 'writing'], 'Atomic notes', 'Give a note one useful claim, then connect it to other claims.', `Atomic does not mean arbitrarily short. A note needs enough context to make sense when encountered outside the project that produced it.\n\n${L('provenance')} is an example: one principle with concrete consequences. ${L('systems')} describes when to promote a rough observation into a note.`],
  ['wikilinks', ['obsidian', 'knowledge'], 'Wikilinks and backlinks', 'Links represent relationships; folders provide location.', `A link to a person can connect a meeting, an interview, and a project. A folder answers a different question: where should this file live?\n\nUse folder-qualified paths when names collide. The fixtures ${L('bridgeNotes')} and ${L('fieldNotes')} deliberately share a basename. Heading links narrow a source to a section; block references point to a specific observation.`],
  ['canvas', ['obsidian', 'visual-thinking'], 'Thinking on a canvas', 'Position and connection can express relations that a linear list hides.', `Use a Canvas for exploring relationships, not just as a second folder tree. File cards keep original notes connected to the visual arrangement. Text cards hold provisional claims.\n\n${L('synthesisBoard')} groups interview observations into themes. ${L('board')} puts sources, decisions, and next actions in one working space. Related: ${L('reading3')}.`],
  ['context', ['ai', 'design'], 'Context is a working set', 'Useful context is selected for the current task, rather than accumulated without limit.', `A whole vault is not a brief. A selected passage with a source may support a decision better than a large undifferentiated document.\n\nThe panel should make inclusion explicit and show what is entering the prompt draft. Evidence: ${L('interview1')}. Application: ${L('scope')}.`],
  ['writing', ['writing', 'craft'], 'Writing is thinking', 'A concrete sentence exposes an unclear idea earlier than a polished layout.', `During ${L('website')}, writing the case studies changed what the design needed to communicate. The retrospective made that sequence explicit.\n\nFor ${L('bridge')}, write a real saved note and prompt excerpt before deciding how their cards should look. See ${L('websiteRetro')}.`],
];
for (const [key, tags, title, claim, detail] of concepts) note(key, {type: 'concept', tags}, `# ${title}\n\n> ${claim}\n\n${detail}\n\n## Connection\n${L('learning')} keeps this idea in the current learning thread.`);

note('03 Resources/Concepts/Écrire pour comprendre.md', {type: 'concept', aliases: ['Write to understand'], tags: ['writing', 'français']}, `
# Écrire pour comprendre
Une note n’est pas seulement un résultat. C’est aussi un outil pour clarifier une idée en cours de travail.

Quand une explication résiste, chercher un exemple concret avant d’ajouter une nouvelle abstraction. Le projet ${L('bridge')} fournit un terrain d’essai : une note, un passage, une conversation, puis une sauvegarde explicite.

This accented filename and bilingual content are intentional fixtures for search, UTF-8 reads, and source links. Related: ${L('writing')}.
`);

note('reading1', {type: 'reading', status: 'Reading', author: 'John Ousterhout', progress: 65, tags: ['reading', 'software']}, `
# A Philosophy of Software Design
## Working question
What complexity should the integration absorb so that the user can keep thinking about their work?

## Personal reflection
A narrow interface can hide a considerable amount of file handling. The abstraction earns its place when it makes common operations predictable rather than merely shorter to type.

For ${L('architecture')}, the useful boundary is between editing a note and the mechanics of safely persisting it. Avoid making every UI component understand how the vault is stored.

## Next
- [ ] Finish the current reading pass.
- [ ] Write one concrete design tradeoff from the panel prototype.

These are original fictional reading reflections, not quotations or a chapter summary.
`);

note('reading2', {type: 'reading', status: 'Finished', author: 'Don Norman', progress: 100, tags: ['reading', 'design']}, `
# The Design of Everyday Things
## Working question
How can the interface make the result of an action apparent before a user takes it?

## Personal reflection
“Add to chat” should show where the text is going. “Save to vault” should show the destination and whether the operation creates a note or appends to one. The action label alone cannot carry every part of that explanation.

## Applied to current work
${L('sketch', 'The panel sketch')} keeps the current note breadcrumb visible. ${L('designReview')} records why that detail survived the critique.

Related concept: ${L('progressive')}. These are fictional original working notes, not book quotations.
`);

note('reading3', {type: 'reading', status: 'Reference', author: 'JSON Canvas', progress: 100, url: 'https://jsoncanvas.org/spec/1.0/', tags: ['reading', 'reference', 'obsidian']}, `
# Working notes on JSON Canvas
Primary reference: [JSON Canvas 1.0 specification](https://jsoncanvas.org/spec/1.0/).

## Integration checklist
- Recognize text, file, link, and group node types.
- Keep node IDs and edge endpoints intact.
- Resolve file paths relative to the vault.
- Preserve node coordinates, dimensions, labels, colors, and subpaths.

## Fixture coverage
${L('board')} contains Markdown file cards, an image card, grouped text, and a public reference link. ${L('synthesisBoard')} includes a file card focused on a heading. All three canvases use real linked notes.

The first panel milestone should recognize Canvas files. A full Canvas editor is a later decision. Related: ${L('canvas')}.
`);

const people = [
  ['maya', 'Maya Chen', 'Research and product strategy', `Owns interview planning and the prototype review. Prefers source evidence close to a design claim.\n\n## Current threads\n${L('research')} · ${L('fieldnotes')}\n\n## Facilitation checklist\n- Ask about the last real task before presenting the concept.\n- Record observations separately from interpretations.\n- Keep the participant’s original wording beside the takeaway.\n\nLast conversation: ${L('planning')}.`],
  ['theo', 'Theo Martin', 'Engineering', `Owns the desktop surface investigation and the local file bridge. Wants explicit behavior for conflicts, unavailable files, and changes made by another editor.\n\n## Current threads\n${L('architecture')} · ${L('adr')}\n\n## Open follow-up\nDemonstrate an external edit before the next ${L('bridge', 'integration')} review.\n\nLast conversation: ${L('planning')}.`],
  ['sofia', 'Sofia Laurent', 'Product design', `Helps the studio critique hierarchy, labels, and interaction feedback. Worked on ${L('website')} and reviewed the first ${L('bridge', 'integration')} panel sketch.\n\n## Working preference\nBring real content into a rough layout early. Pay attention to what remains readable when the pane becomes narrow.\n\nLast critique: ${L('designReview')}.`],
];
for (const [key, name, role, body] of people) note(key, {type: 'person', role, tags: ['people'], fictional: true}, `# ${name}\n**${role}** · Fictional demo collaborator.\n\n${body}`);

const meetings = [
  ['kickoff', '2026-10-05', 'Integration kickoff', ['maya','theo'], 'Find a narrow workflow worth testing before choosing a renderer.', `We agreed to study the movement from a note to a conversation and back. The first two interviews will use an actual note rather than a hypothetical collection.\n\n## Actions\n- [x] Maya: schedule two fictional research sessions.\n- [x] Theo: list the desktop surface uncertainties.\n- [x] Draft ${L('scope')}.`],
  ['researchReview', '2026-10-12', 'Research review', ['maya','theo'], 'Select three findings that change the first milestone.', `Folder context, deliberate selection, and a visible save destination recur in the two interview scenarios. We will keep these in the first prototype and postpone automatic vault-wide retrieval.\n\n## Actions\n- [x] Publish ${L('research')}.\n- [x] Arrange ${L('synthesisBoard', 'the evidence wall')}.\n- [x] Draft the canonical-vault decision.`],
  ['designReview', '2026-10-15', 'Panel design critique', ['maya','sofia'], 'Review the note panel with real source material.', `The first sketch hid the folder path once a note opened. We restored a persistent breadcrumb and gave the excerpt action a clear destination. The note title stays distinct from a prompt draft.\n\n![[09 Attachments/Panel sketch.svg]]\n\n## Actions\n- [x] Update the sketch.\n- [ ] Test the panel at a narrow width.\n- [ ] Verify keyboard focus after adding an excerpt.\n\nRelated: ${L('progressive')}.`],
  ['planning', '2026-10-19', 'Weekly planning', ['maya','theo'], 'Make one real note render inside Claude Desktop.', `The current priority is proving the mounting point and bridge together. Extra layout polish waits until a note can be opened reliably. We will use the Atelier demo vault for link, Canvas, attachment, and duplicate-title cases.\n\n## Actions\n- [ ] Theo: validate the desktop panel surface by 21 October.\n- [ ] Maya: prepare the retrieval scenario from ${L('interview1')}.\n- [ ] Record what happens when a note changes externally.\n\nPlan: ${L('weekly3')}. Delivery checks: ${L('scope')}.`],
];
for (const [key,date,title,attendees,outcome,body] of meetings) note(key, {type:'meeting',date,attendees:attendees.map(k=>L(k)),project:L('bridge'),tags:['meeting']}, `# ${title}\n**${date} · 10:00 Europe/Paris · 30 minutes**\n\n## Intended outcome\n${outcome}\n\n## Discussion\n${body}`);

const weeks = [
  ['weekly1','2026-W41','5–11 October','Understand the handoff', `We completed the kickoff and the two interview fixtures. The useful finding was not “search everything”; it was that people select and edit context before sending it.\n\n## Shipped this week\n- [x] ${L('interview1')}\n- [x] ${L('interview2')}\n- [x] Initial product brief\n\n## Carry forward\nWrite the synthesis and test whether folder context resolves duplicate titles.`],
  ['weekly2','2026-W42','12–18 October','Turn observations into a narrow design', `The synthesis, canonical-store decision, and first panel critique are now connected. ${L('fieldnotes')} remains paused so the smaller integration can answer the retrieval question first.\n\n## Shipped this week\n- [x] ${L('research')}\n- [x] ${L('adr')}\n- [x] ${L('designReview')}\n\n## Carry forward\nProve the desktop surface before expanding the design.`],
  ['weekly3','2026-W43','19–25 October','Prove the real note workflow', `## Outcomes\n- [ ] Render one existing vault note inside Claude Desktop.\n- [ ] Show a real external-change case.\n- [ ] Keep the prompt draft intact when adding a passage.\n\n## Schedule\nMonday: ${L('planning')}. Wednesday: prototype surface check. Friday: write down the limitations and choose the next increment.\n\n## Protect the scope\nThe graph, editable Canvas, and semantic search are parked. ${L('scope')} remains the acceptance reference.\n\n## Review\nNot written yet; this is the current planning week.`],
];
for(const [key,week,range,focus,body] of weeks) note(key,{type:'weekly',week,focus,tags:['journal','weekly']},`# ${week}\n**${range}** · ${focus}\n\n${body}`);

const days = [
 ['2026-10-05','Start with the actual handoff',['Run the kickoff','Draft the project brief','Collect existing note examples'],'The initial scope was too broad. A note-to-conversation round trip is concrete enough to observe.','kickoff'],
 ['2026-10-06','Close the website chapter',['Write the website retrospective','File the launch notes','Prepare interview prompts'],'Writing before layout saved more time than any component shortcut. Carry that lesson into the integration.','websiteRetro'],
 ['2026-10-07','Prepare useful research',['Choose a retrieval task','Find two notes with similar names','Prepare the interview worksheet'],'A successful search is not only a matching title. The folder can carry the missing context.','scope'],
 ['2026-10-08','Observe retrieval',['Run Maya’s interview','Record source-selection steps','Separate quotes from interpretations'],'Maya removed half the copied text before sending. Passage selection belongs in the workflow.','interview1'],
 ['2026-10-09','Observe saving',['Run Theo’s interview','Capture the duplicate-copy case','Write the weekly review'],'Saving to the wrong copy is worse than an extra click. The destination needs to be visible.','interview2'],
 ['2026-10-12','Find the common threads',['Run the research review','Write the synthesis','Arrange the research wall'],'Three themes are enough: find, choose, trust. Everything else can wait for the prototype.','researchReview'],
 ['2026-10-13','Map the boundaries',['Draft the architecture','Check bridge options','List external-edit cases'],'The UI should not know every detail of file persistence. Keep that boundary small and explicit.','architecture'],
 ['2026-10-14','Choose the canonical store',['Accept the first decision record','Sketch the read and save flow','Connect the source notes'],'A disposable index is acceptable; a second authoritative copy of every note is not.','adr'],
 ['2026-10-15','Critique with real notes',['Review the panel sketch','Check the narrow layout','Keep the breadcrumb visible'],'The folder path looked expendable until the same note title appeared twice.','designReview'],
 ['2026-10-16','Make the next week small',['Finish the weekly review','Clean the inbox','Prepare the fixture checklist'],'Next week’s outcome should be one note rendered in the real desktop surface. A convincing static mock is insufficient.','weekly2'],
 ['2026-10-19','Use a realistic vault',['Validate the demo vault and Canvas files','Find the correct Research/Notes.md','Write the desktop surface spike checklist'],'Planning note: leave this reflection open until the prototype investigation is complete.','planning'],
];
for (let i=0;i<days.length;i++) {
 const [date,focus,top,reflection,related]=days[i];
 const completed=date<'2026-10-19';
 const before=i>0?L(`05 Journal/Daily/${days[i-1][0]}.md`,'Previous working day'):'First working day in this fixture';
 const after=i<days.length-1?L(`05 Journal/Daily/${days[i+1][0]}.md`,'Next working day'):L('weekly3','This week');
 note(`05 Journal/Daily/${date}.md`,{type:'daily',date,focus,created:date,updated:date,tags:['journal','daily']},`# ${date}\n**${focus}**\n\n${before} · ${after}\n\n## Top three\n${top.map(t=>`- [${completed?'x':' '}] ${t}`).join('\n')}\n\n## Working notes\n${L(related)} is today’s main thread. Keep the original evidence linked when promoting an observation into a reusable note.\n\n## End of day\n${reflection}\n\n## Loose ends\n${completed?'Carry the next concrete action into the weekly review.':'- [ ] Capture any new technical constraints in the architecture note.'}`);
}

note('archive',{type:'project',status:'Archived',priority:3,due:'2026-09-04',owner:L('sofia'),created:'2026-08-17',updated:'2026-09-07',tags:['project','archive']},`
# Meridian · archived project
A fictional experiment in turning a visual reading list into a standalone application. Archived after three weeks because the team could not identify a recurring task that was better served outside the existing vault.

## Keep
The idea that a useful visual arrangement should stay connected to its original notes. This became part of ${L('canvas')}.

## Lesson
Do not build a second home for information before understanding why the first one is difficult to use. ${L('fieldnotes')} is paused for the same reason.

## Revisit only if
A concrete workflow repeatedly fails in the integrated environment and has a clear user willing to test it.
`);

const templates = [
 ['Daily note', '# {{date}}\n\n## Top three\n- [ ] \n- [ ] \n- [ ] \n\n## Working notes\n\n## End of day\nWhat changed, and what is the next small action?'],
 ['Project', '# {{title}}\n\n## Outcome\nWhat will be different when this is done?\n\n## Success criteria\n- [ ] \n\n## Working set\n\n## Decisions\n\n## Next action'],
 ['Meeting', '# {{title}}\n**{{date}} · Europe/Paris**\n\n## Intended outcome\n\n## Attendees\n\n## Discussion\n\n## Decisions\n\n## Actions\n- [ ] Owner · action · due date'],
 ['Concept', '# {{title}}\n\n> One useful claim.\n\n## Explanation\n\n## Concrete example\n\n## Connections\n\n## Sources'],
];
for(const [title,body] of templates) note(`11 Templates/${title}.md`,{type:'template',tags:['template']},body);
