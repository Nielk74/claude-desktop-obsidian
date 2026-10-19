import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {mergeClaudeConfig,installClaude} from '../scripts/install-claude.mjs';

test('configuration merge preserves unrelated servers, preferences, and the input object',()=>{
 const previous={preferences:{keep:true},mcpServers:{existing:{command:'other'}}};
 const entry={command:'node',args:['server.mjs']};
 const merged=mergeClaudeConfig(previous,entry);
 assert.deepEqual(merged.mcpServers.existing,{command:'other'});
 assert.equal(merged.preferences.keep,true);assert.deepEqual(merged.mcpServers['atelier-obsidian'],entry);
 assert.equal(previous.mcpServers['atelier-obsidian'],undefined);
 assert.throws(()=>mergeClaudeConfig({mcpServers:{'atelier-obsidian':{command:'different'}}},entry),/already exists/);
});
test('installer keeps an exact backup and is idempotent',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'atelier-config-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const configPath=path.join(root,'claude_desktop_config.json');const original='{\n  "other": true\n}\n';await fs.writeFile(configPath,original);
 const options={configPath,projectDir:path.resolve('.'),vaultPath:path.resolve('Atelier Demo Vault'),nodePath:process.execPath};
 const first=await installClaude(options);assert.equal(await fs.readFile(first.backup,'utf8'),original);
 const config=JSON.parse(await fs.readFile(configPath,'utf8'));assert.equal(config.other,true);assert.equal(config.mcpServers['atelier-obsidian'].args.at(-1),options.vaultPath);
 const second=await installClaude(options);assert.equal(second.changed,false);
});
