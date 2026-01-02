#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';

const workspaceRoot = new URL('../', import.meta.url).pathname.replace(/\/$/, '');
const scriptPath = path.join(workspaceRoot, 'daemon.js');

function consolePrefix() { return `[mock ns]`; }

import { pathToFileURL } from 'url';

// Very small, pragmatic ns stub sufficient for basic startup runs of daemon.js
let _pidCounter = 1000;
const _running = new Map();
const ns = {
    args: process.argv.slice(2),
    pid: 12345,
    print: (...a) => console.log(consolePrefix(), ...a),
    tprint: (...a) => console.log(consolePrefix(), ...a),
    toast: (...a) => console.log(consolePrefix(), ...a),
    ui: { openTail: () => { }, resizeTail: () => { }, moveTail: () => { }, windowSize: () => [1200, 800] },
    disableLog: () => { },
    read: async (file) => {
        try {
            const p = file.startsWith('/') ? path.join(workspaceRoot, file.slice(1)) : path.join(workspaceRoot, file);
            return await fs.readFile(p, 'utf8');
        } catch (e) { return ''; }
    },
    write: async (file, data, mode = 'w') => {
        const p = file.startsWith('/') ? path.join(workspaceRoot, file.slice(1)) : path.join(workspaceRoot, file);
        await fs.mkdir(path.dirname(p), { recursive: true });
        await fs.writeFile(p, data, 'utf8');
        return true;
    },
    flags: (schema) => {
        const out = { _: [] };
        for (const [key, def] of schema) out[key] = def;
        const argv = ns.args;
        for (let i = 0; i < argv.length; i++) {
            const a = argv[i];
            if (!a.startsWith('-')) { out._.push(a); continue; }
            const key = a.replace(/^--?/, '');
            const next = argv[i + 1];
            if (next && !next.startsWith('-')) { out[key] = (isNaN(Number(next)) ? next : Number(next)); i++; }
            else out[key] = true;
        }
        return out;
    },
    getScriptName: () => 'daemon.js',
    getHostname: () => 'home',
    getPlayer: () => ({ skills: { hacking: 1 }, mults: { hacking_grow: 1 } }),
    getServerMoneyAvailable: () => 1e12,
    getServerMaxRam: () => 1024,
    getServerUsedRam: () => 0,
    ps: (host = 'home') => {
        // Return an array similar to ns.ps
        return Array.from(_running.entries()).filter(([,v]) => v.host === host).map(([pid,v]) => ({ pid: Number(pid), filename: v.file, args: v.args || [] }));
    },
    isRunning: (pid) => !!_running.get(pid),
    run: async (fileName, runOptions = {}, ...args) => {
        const p = path.join(workspaceRoot, fileName.startsWith('/') ? fileName.slice(1) : fileName);
        try {
            const mod = await import(pathToFileURL(p).href);
            const pid = ++_pidCounter;
            _running.set(pid, { file: fileName, args, host: 'home' });
            (async () => {
                try {
                    ns.args = args;
                    if (mod && mod.main) await mod.main(ns);
                } catch (err) {
                    ns.tprint('Error in temp script', fileName, err && err.stack ? err.stack : String(err));
                } finally {
                    _running.delete(pid);
                }
            })();
            return pid;
        } catch (err) {
            ns.tprint('Error running file', fileName, err && err.stack ? err.stack : String(err));
            return 0;
        }
    },
    exec: async (fileName, host = 'home', ...args) => {
        // For our mock, treat exec same as run but record host
        const p = path.join(workspaceRoot, fileName.startsWith('/') ? fileName.slice(1) : fileName);
        try {
            const mod = await import(pathToFileURL(p).href);
            const pid = ++_pidCounter;
            _running.set(pid, { file: fileName, args, host });
            (async () => {
                try { ns.args = args; if (mod && mod.main) await mod.main(ns); }
                catch (err) { ns.tprint('Error in temp script', fileName, err && err.stack ? err.stack : String(err)); }
                finally { _running.delete(pid); }
            })();
            return pid;
        } catch (err) { ns.tprint('Error exec file', fileName, err && err.stack ? err.stack : String(err)); return 0; }
    },
    sleep: (ms) => new Promise(r => setTimeout(r, ms)),
    uiOpenTail: () => { },
};

async function main() {
    try {
        ns.print('Starting local mock runner for daemon.js');
        // Import the real script as a module and call its exported main
        const mod = await import('../daemon.js');
        if (!mod || !mod.main) {
            ns.print('daemon.js does not export a `main` function as expected.');
            process.exit(1);
        }
        // Call the main function with our stubbed ns. Catch errors to display stack info.
        await mod.main(ns);
    } catch (err) {
        ns.tprint('Error while running daemon.js in mock:');
        ns.tprint(err && err.stack ? err.stack : String(err));
        process.exit(2);
    }
}

main();
