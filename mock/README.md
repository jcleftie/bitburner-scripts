This mock runner provides a minimal `ns` stub so you can run `daemon.js` in Node for quick startup debugging.

Usage:

```bash
node mock/run-daemon-mock.js --run-once --verbose
```

Notes:
- The runner is intentionally minimal and will not faithfully emulate the full Bitburner environment.
- It helps reproduce startup errors and missing imports quickly; many runtime behaviours (scheduling, `ns.run` temporary scripts, etc.) are stubbed.
- If you need deeper emulation (e.g. `getNsDataThroughFile` behaviour), we can extend the stub to execute temporary scripts and simulate server state.
