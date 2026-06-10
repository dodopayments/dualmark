import { spawn } from "node:child_process";
import { createServer } from "node:net";

const host = "127.0.0.1";
const port = 4322;

async function assertPortAvailable() {
  await new Promise((resolve, reject) => {
    const server = createServer();

    server.once("error", (error) => {
      reject(error);
    });

    server.once("listening", () => {
      server.close(resolve);
    });

    server.listen(port, host);
  });
}

try {
  await assertPortAvailable();
} catch (error) {
  if (error && typeof error === "object" && "code" in error && error.code === "EADDRINUSE") {
    console.error(`Port ${port} is already in use.`);
    console.error("Stop the existing dev server, then run this command again:");
    console.error("  Get-Process bun -ErrorAction SilentlyContinue | Stop-Process -Force");
    process.exit(1);
  }

  throw error;
}

const child = spawn("astro", ["dev", "--host", host, "--port", String(port)], {
  stdio: "inherit",
  shell: process.platform === "win32",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
