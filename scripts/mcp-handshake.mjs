import { spawn } from "node:child_process";
import { once } from "node:events";

const DEFAULT_TIMEOUT_MS = 30_000;
const STOP_TIMEOUT_MS = 5_000;

function stderrSuffix(stderr) {
  const text = stderr.trim();
  return text ? `\n${text}` : "";
}

async function withTimeout(promise, timeoutMs, message) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function stopChild(child) {
  if (child.exitCode !== null || child.signalCode !== null) {
    return;
  }

  child.kill("SIGTERM");
  const exited = once(child, "exit").then(() => true);
  const timedOut = new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), STOP_TIMEOUT_MS);
    timer.unref();
  });

  const stopped = await Promise.race([exited, timedOut]);
  if (!stopped && child.exitCode === null && child.signalCode === null) {
    child.kill("SIGKILL");
    await once(child, "exit");
  }
}

// Performs a real MCP stdio handshake: initialize, notifications/initialized,
// tools/list. The child is stopped before returning so a check does not leave a
// server (or a browser) running.
export async function initializeMcpServer({
  name,
  command,
  args = [],
  timeoutMs = DEFAULT_TIMEOUT_MS,
}) {
  const child = spawn(command, args, { stdio: ["pipe", "pipe", "pipe"], env: process.env });
  const pending = new Map();
  let nextId = 1;
  let stderr = "";
  let settled = false;
  let failureError;

  function fail(error) {
    if (settled) {
      return;
    }
    settled = true;
    failureError = error;
    for (const pendingRequest of pending.values()) {
      pendingRequest.reject(error);
    }
    pending.clear();
  }

  function onExit(code, signal) {
    fail(
      new Error(
        `${name}: server exited before the handshake completed ` +
          `(code ${String(code)}, signal ${String(signal)})${stderrSuffix(stderr)}`,
      ),
    );
  }

  child.on("error", (error) => {
    fail(new Error(`${name}: failed to start ${command}: ${error.message}`, { cause: error }));
  });
  child.stdin.on("error", (error) => {
    fail(new Error(`${name}: failed to write to ${command}: ${error.message}`, { cause: error }));
  });
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk) => {
    stderr = (stderr + chunk).slice(-4_000);
  });
  child.on("exit", onExit);

  let buffer = "";
  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    buffer += chunk;
    let newline = buffer.indexOf("\n");
    while (newline >= 0) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      newline = buffer.indexOf("\n");
      if (!line) {
        continue;
      }

      let message;
      try {
        message = JSON.parse(line);
      } catch (error) {
        fail(new Error(`${name}: invalid JSON on stdout: ${line}`, { cause: error }));
        continue;
      }

      if (message.id === undefined || message.id === null) {
        continue;
      }

      const pendingRequest = pending.get(message.id);
      if (!pendingRequest) {
        continue;
      }
      pending.delete(message.id);
      if (message.error) {
        pendingRequest.reject(
          new Error(`${name}: ${pendingRequest.method} failed: ${message.error.message}`),
        );
      } else {
        pendingRequest.resolve(message.result);
      }
    }
  });

  function request(method, params) {
    if (failureError) {
      return Promise.reject(failureError);
    }

    const id = nextId;
    nextId += 1;
    const response = new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject, method });
    });
    child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
    return withTimeout(
      response,
      timeoutMs,
      `${name}: ${method} timed out after ${timeoutMs}ms${stderrSuffix(stderr)}`,
    );
  }

  try {
    const initialization = await request("initialize", {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "call-calendar-mcp-check", version: "0.0.0" },
    });

    child.stdin.write(
      `${JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" })}\n`,
    );
    const tools = await request("tools/list", {});

    const toolCount = tools?.tools?.length ?? 0;
    if (toolCount === 0) {
      throw new Error(`${name}: tools/list returned no tools`);
    }

    return {
      name,
      protocolVersion: initialization?.protocolVersion,
      serverInfo: initialization?.serverInfo,
      tools: toolCount,
    };
  } finally {
    settled = true;
    child.off("exit", onExit);
    await stopChild(child);
  }
}
