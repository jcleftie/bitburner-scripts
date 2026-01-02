/** @param {NS} ns **/
export async function main(ns) {
    const script = '/Tasks/backdoor-all-servers.js';
    const threads = 1;
    const pid = ns.exec(script, 'home', threads);
    if (pid === 0) {
        ns.tprint(`Failed to start ${script} on home (insufficient RAM or script not found). Run: home; run ${script}`);
        return;
    }
    ns.tprint(`Started ${script} on home (pid ${pid}).`);
}
