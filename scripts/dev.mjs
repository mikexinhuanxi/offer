import { spawn } from "node:child_process";

const commands = [
  ["server", ["run", "dev", "-w", "server"]],
  ["client", ["run", "dev", "-w", "client"]]
];

const children = commands.map(([name, args]) => {
  const child = spawn("npm", args, {
    stdio: ["ignore", "pipe", "pipe"],
    shell: false
  });

  child.stdout.on("data", (chunk) => {
    process.stdout.write(`[${name}] ${chunk}`);
  });
  child.stderr.on("data", (chunk) => {
    process.stderr.write(`[${name}] ${chunk}`);
  });

  return child;
});

function shutdown(signal) {
  for (const child of children) {
    child.kill(signal);
  }
}

process.on("SIGINT", () => {
  shutdown("SIGINT");
  process.exit(130);
});

process.on("SIGTERM", () => {
  shutdown("SIGTERM");
  process.exit(143);
});
