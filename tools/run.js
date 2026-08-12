/**
 * Cross-platform launcher for the debug flags (no cross-env dependency).
 *   node tools/run.js --debug      → renderer console forwarded to this terminal
 *   node tools/run.js --selftest   → also renders every panel tab and face once
 */
const { spawn } = require('child_process');
const electron = require('electron');

const env = { ...process.env };
if (process.argv.includes('--debug')) env.LUMINA_DEBUG = '1';
if (process.argv.includes('--selftest')) { env.LUMINA_DEBUG = '1'; env.LUMINA_SELFTEST = '1'; }

const child = spawn(electron, ['.'], { stdio: 'inherit', env });
child.on('close', (code) => process.exit(code ?? 0));
