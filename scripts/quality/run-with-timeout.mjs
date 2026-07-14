#!/usr/bin/env node

import { spawn } from "node:child_process";

const [timeoutText, command, ...args] = process.argv.slice(2);
const timeoutMs = Number.parseInt(timeoutText ?? "", 10);

if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || !command) {
  console.error("Usage: run-with-timeout.mjs <milliseconds> <command> [args...]");
  process.exit(2);
}

const detached = process.platform !== "win32";
const child = spawn(command, args, {
  stdio: "inherit",
  detached,
  env: process.env
});

let timedOut = false;

function signalChild(signal) {
  if (child.pid === undefined) {
    return;
  }

  try {
    process.kill(detached ? -child.pid : child.pid, signal);
  } catch (error) {
    if (error?.code !== "ESRCH") {
      throw error;
    }
  }
}

const timer = setTimeout(() => {
  timedOut = true;
  console.error(`Command exceeded ${timeoutMs}ms: ${[command, ...args].join(" ")}`);
  signalChild("SIGTERM");
  setTimeout(() => signalChild("SIGKILL"), 2_000).unref();
}, timeoutMs);

child.on("error", (error) => {
  clearTimeout(timer);
  console.error(`Unable to start ${command}: ${error.message}`);
  process.exitCode = 1;
});

child.on("exit", (code, signal) => {
  clearTimeout(timer);

  if (timedOut) {
    process.exitCode = 124;
    return;
  }

  if (signal) {
    console.error(`Command ended after signal ${signal}.`);
    process.exitCode = 1;
    return;
  }

  process.exitCode = code ?? 1;
});
