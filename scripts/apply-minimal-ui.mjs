import path from 'node:path';
import{fileURLToPath}from'node:url';
import{applyDemoMinimalUi}from'../src/desktop/minimal-ui.mjs';
const project=fileURLToPath(new URL('../',import.meta.url)),index=process.argv.indexOf('--vault');
if(index<0||!process.argv[index+1])throw new Error('Pass --vault with the disposable embedded demo vault path.');
console.log(JSON.stringify(await applyDemoMinimalUi(project,path.resolve(process.argv[index+1]),{restore:process.argv.includes('--restore')})));
