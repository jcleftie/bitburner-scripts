/**
 * Backdoor all servers by connecting via the terminal and calling `ns.singularity.installBackdoor()`
 * Usage: run Tasks/backdoor-all-term.js [spawnDelayMs=50]
 */
/** @param {NS} ns **/
export async function main(ns) {
    const spawnDelay = ns.args.length > 0 ? Number(ns.args[0]) : 50;
    let notAtHome = false;
    try {
        if (!ns.singularity || !ns.singularity.connect) {
            ns.tprint('This script requires Singularity API access (SF-4).');
            return;
        }

        const servers = ['home'];
        const routes = { home: ['home'] };

        ns.disableLog('scan');
        for (let i = 0; i < servers.length; i++) {
            const cur = servers[i];
            const children = ns.scan(cur);
            for (const child of children) {
                if (!servers.includes(child)) {
                    servers.push(child);
                    routes[child] = routes[cur].slice();
                    routes[child].push(child);
                }
            }
        }

        const myHack = ns.getHackingLevel();
        const toCheck = servers.filter(s => s !== 'home' && !s.includes('hacknet-') && !s.includes('daemon'));
        const required = {};
        const rooted = {};
        for (const s of toCheck) {
            required[s] = ns.getServerRequiredHackingLevel(s);
            rooted[s] = ns.hasRootAccess(s);
        }

        let toBackdoor = toCheck.filter(s => rooted[s] && myHack >= required[s]);
        ns.tprint(`Found ${toBackdoor.length} servers eligible for backdoor (rooted and within hack level).`);
        if (toBackdoor.length === 0) return;

        // Sort by required hacking level (easiest first)
        toBackdoor.sort((a, b) => required[a] - required[b]);

        for (const server of toBackdoor) {
            ns.tprint(`Preparing to backdoor ${server}...`);
            notAtHome = true;
            const route = routes[server];
            // Hop along route
            for (const hop of route) {
                await ns.singularity.connect(hop);
                await ns.sleep(10);
            }
            // Now on the target
            try {
                await ns.singularity.installBackdoor();
                ns.toast(`Backdoored ${server}`, 'success');
                ns.tprint(`Backdoored ${server}`);
            } catch (err) {
                ns.tprint(`Failed to backdoor ${server}: ${String(err)}`);
            }
            // Sleep a bit and go back home
            await ns.sleep(spawnDelay);
            try { await ns.singularity.connect('home'); notAtHome = false; } catch { /* ignore */ }
        }
    } catch (err) {
        ns.tprint('ERROR: ' + String(err));
    } finally {
        if (notAtHome) {
            try { await ns.singularity.connect('home'); } catch { }
        }
    }
}
