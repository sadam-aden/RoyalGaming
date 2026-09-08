// Stops any copy of the local dev setup, for when a previous run was left
// behind (a closed terminal, a crashed server) and its ports are still held.
import { execSync } from "node:child_process";

const PORTS = [4000, 5173, 5174];
const isWindows = process.platform === "win32";

function pidsOnPort(port) {
  try {
    if (isWindows) {
      // No `-p tcp`: on Windows that filters to IPv4 only, and Vite listens on
      // IPv6 loopback ([::1]), so the dev server would never be found.
      const out = execSync(`netstat -ano`, { encoding: "utf8" });
      return [
        ...new Set(
          out
            .split("\n")
            .filter((line) => line.includes("LISTENING") && line.includes(`:${port} `))
            .map((line) => line.trim().split(/\s+/).pop())
            .filter((pid) => pid && pid !== "0")
        ),
      ];
    }
    const out = execSync(`lsof -ti tcp:${port} -sTCP:LISTEN`, { encoding: "utf8" });
    return out.split("\n").map((p) => p.trim()).filter(Boolean);
  } catch {
    return []; // nothing listening on that port
  }
}

let stopped = 0;
for (const port of PORTS) {
  for (const pid of pidsOnPort(port)) {
    try {
      // /T also takes down the npm wrapper processes spawned underneath.
      execSync(isWindows ? `taskkill /F /T /PID ${pid}` : `kill -9 ${pid}`, { stdio: "ignore" });
      console.log(`Stopped process ${pid} (was holding port ${port})`);
      stopped++;
    } catch {
      console.error(`Could not stop process ${pid} on port ${port} — you may need to close its terminal.`);
    }
  }
}

console.log(stopped === 0 ? "Nothing was running." : `\nDone — stopped ${stopped} process(es). You can run 'npm run dev' now.`);
