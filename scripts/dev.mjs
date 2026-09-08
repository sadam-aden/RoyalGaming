// Starts the API server and the web client together, so local development is a
// single `npm run dev` instead of two terminals. Deliberately dependency-free —
// spawning two npm scripts does not justify pulling in a task runner.
import { spawn } from "node:child_process";
import { connect } from "node:net";

// Both ports are fixed (the client proxies to the API on 4000), so a port that
// is already taken means another copy is running. Check up front and say so
// plainly — otherwise Node throws a raw EADDRINUSE stack trace that buries the
// one thing worth knowing: it is already running.
//
// This probes by connecting rather than by binding: Vite listens on IPv6
// loopback only, and binding 0.0.0.0 (IPv4) succeeds even while [::1] is taken,
// so a bind test would report the port free and then fail seconds later.
function canConnect(port, host) {
  return new Promise((resolve) => {
    const socket = connect({ port, host });
    const done = (result) => {
      socket.destroy();
      resolve(result);
    };
    socket.setTimeout(1000);
    socket.once("connect", () => done(true));
    socket.once("timeout", () => done(false));
    socket.once("error", () => done(false));
  });
}

async function portInUse(port) {
  const [v4, v6] = await Promise.all([canConnect(port, "127.0.0.1"), canConnect(port, "::1")]);
  return v4 || v6;
}

const required = [
  { port: 4000, label: "API server" },
  { port: 5173, label: "web client" },
];

const busy = [];
for (const entry of required) {
  if (await portInUse(entry.port)) busy.push(entry);
}

if (busy.length > 0) {
  const list = busy.map((b) => `  - port ${b.port} (${b.label})`).join("\n");
  console.error(
    `\n\x1b[31mRoyal Gaming is already running.\x1b[0m\n\n` +
      `These ports are in use:\n${list}\n\n` +
      `Stop the other copy first — press Ctrl+C in the terminal running it, or close that terminal.\n` +
      `If you cannot find it, run this to stop every copy, then try again:\n\n` +
      `  npm run dev:stop\n`
  );
  process.exit(1);
}

const tasks = [
  { name: "server", script: "dev:server", color: "\x1b[36m" }, // cyan
  { name: "client", script: "dev:client", color: "\x1b[35m" }, // magenta
];

const RESET = "\x1b[0m";
const children = [];
let shuttingDown = false;

function prefixLines(text, name, color) {
  return text
    .toString()
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => `${color}[${name}]${RESET} ${line}`)
    .join("\n");
}

for (const { name, script, color } of tasks) {
  // shell:true so this resolves npm.cmd on Windows as well as npm on POSIX.
  // The command is passed as one string because supplying a separate args array
  // alongside shell:true is deprecated (DEP0190); the script names are literals
  // defined above, so nothing user-supplied is interpolated into the shell.
  const child = spawn(`npm run ${script}`, { shell: true, stdio: ["ignore", "pipe", "pipe"] });

  child.stdout.on("data", (data) => console.log(prefixLines(data, name, color)));
  child.stderr.on("data", (data) => console.error(prefixLines(data, name, color)));

  child.on("exit", (code) => {
    if (shuttingDown) return;
    // If one half dies the other is useless on its own, so bring both down
    // rather than leaving a half-running setup that looks fine but isn't.
    console.error(`${color}[${name}]${RESET} exited with code ${code} — stopping the other process too.`);
    shutdown();
  });

  children.push(child);
}

function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (child.exitCode === null) child.kill();
  }
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

console.log("Starting Royal Gaming locally — client http://localhost:5173, API http://localhost:4000");
console.log("Press Ctrl+C to stop both.\n");
