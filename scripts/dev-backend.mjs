import { spawn } from "node:child_process";

const commands = [
  ["run", "dev", "--workspace=@billing-agent/api"],
  ["run", "dev:worker", "--workspace=@billing-agent/api"],
];
const children = commands.map((args) => spawn("npm", args, { stdio: "inherit" }));
let shuttingDown = false;

for (const child of children) {
  child.on("error", () => shutdown(1));
  child.on("exit", (code) => {
    if (!shuttingDown) shutdown(code ?? 1);
  });
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

function shutdown(exitCode) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) child.kill("SIGTERM");
  process.exitCode = exitCode;
}
