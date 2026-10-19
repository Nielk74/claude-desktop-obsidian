import {StdioServerTransport} from '@modelcontextprotocol/server/stdio';
import {fileURLToPath} from 'node:url';
import {createServer} from './mcp.mjs';

const index=process.argv.indexOf('--vault');
const root=index>=0?process.argv[index+1]:fileURLToPath(new URL('../Atelier Demo Vault',import.meta.url));
try{await (await createServer(root)).connect(new StdioServerTransport());}
catch(error){console.error('Atelier panel could not start:',error.message);process.exitCode=1;}
