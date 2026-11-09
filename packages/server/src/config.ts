import { fileURLToPath } from "node:url";
import { Temporal } from "temporal-polyfill";

const DEFAULT_PORT = 3000;
const DEFAULT_DATABASE_URL = "postgres://postgres:postgres@localhost:5432/call_calendar";
const DEFAULT_MIGRATE_ON_START = true;
const DEFAULT_OWNER_TIME_ZONE = "Europe/Moscow";
const DEFAULT_WORKING_HOURS_START = "10:00";
const DEFAULT_WORKING_HOURS_END = "18:00";
const DEFAULT_WORKING_DAYS = "1,2,3,4,5";

// Repository root `.env`, resolved the same way from `src/` and `dist/`.
const ENV_FILE_PATH = fileURLToPath(new URL("../../../.env", import.meta.url));

type Env = Readonly<Record<string, string | undefined>>;

type WorkingHours = {
  start: Temporal.PlainTime;
  end: Temporal.PlainTime;
};

export type OwnerConfig = {
  timeZone: string;
  workingHours: WorkingHours;
  workingDays: readonly number[];
};

export type Config = {
  port: number;
  databaseUrl: string;
  migrateOnStart: boolean;
  /** Built web assets served by the API; unset in development, where Vite serves them. */
  webDist: string | undefined;
  owner: OwnerConfig;
};

type ParsedTime = {
  value: Temporal.PlainTime;
  parsed: boolean;
};

export class ConfigError extends Error {
  readonly problems: readonly string[];

  constructor(problems: readonly string[]) {
    super(`Invalid configuration:\n- ${problems.join("\n- ")}`);
    this.name = "ConfigError";
    this.problems = problems;
  }
}

function isErrnoException(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

/**
 * Loads the repository `.env` into `process.env`. Variables that are already
 * set win, so the precedence is: process environment, `.env`, code defaults.
 * A missing file is expected: `.env` is optional.
 */
export function loadDotEnv(path: string = ENV_FILE_PATH): void {
  try {
    process.loadEnvFile(path);
  } catch (error) {
    if (isErrnoException(error) && error.code === "ENOENT") {
      return;
    }

    throw new Error(`Load .env: ${path}`, { cause: error });
  }
}

function readEnv(env: Env, name: string, fallback: string): string {
  const raw = env[name];

  if (raw === undefined) {
    return fallback;
  }

  return raw.trim();
}

function readOptionalEnv(env: Env, name: string): string | undefined {
  const raw = env[name]?.trim();

  return raw === undefined || raw === "" ? undefined : raw;
}

function parsePort(raw: string, problems: string[]): number {
  const port = Number(raw);

  if (!/^\d+$/.test(raw) || port < 1 || port > 65535) {
    problems.push(`PORT must be an integer between 1 and 65535, got "${raw}"`);
    return DEFAULT_PORT;
  }

  return port;
}

function parseDatabaseUrl(raw: string, problems: string[]): string {
  try {
    const url = new URL(raw);

    if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
      problems.push(`DATABASE_URL must use the postgres:// or postgresql:// scheme, got "${raw}"`);
    }
  } catch {
    problems.push(`DATABASE_URL must be a valid URL, got "${raw}"`);
  }

  return raw;
}

function parseBoolean(name: string, raw: string, fallback: boolean, problems: string[]): boolean {
  const normalized = raw.toLowerCase();

  if (normalized === "true" || normalized === "1") {
    return true;
  }

  if (normalized === "false" || normalized === "0") {
    return false;
  }

  problems.push(`${name} must be one of true, false, 1, 0, got "${raw}"`);
  return fallback;
}

function parseTimeZone(raw: string, problems: string[]): string {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", { timeZone: raw });
    return formatter.resolvedOptions().timeZone;
  } catch {
    problems.push(`OWNER_TIMEZONE must be an IANA time zone, got "${raw}"`);
    return DEFAULT_OWNER_TIME_ZONE;
  }
}

function parseTimeOfDay(name: string, raw: string, problems: string[]): ParsedTime {
  try {
    return { value: Temporal.PlainTime.from(raw), parsed: true };
  } catch {
    problems.push(`${name} must be a time of day like "10:00", got "${raw}"`);
    return { value: Temporal.PlainTime.from("00:00"), parsed: false };
  }
}

function parseWorkingDays(raw: string, problems: string[]): readonly number[] {
  const days = new Set<number>();

  for (const part of raw.split(",")) {
    const day = part.trim();

    if (!/^[1-7]$/.test(day)) {
      problems.push(
        `WORKING_DAYS must be a comma-separated list of ISO weekdays 1-7, got "${day}"`,
      );
      continue;
    }

    days.add(Number(day));
  }

  return [...days].toSorted((left, right) => left - right);
}

/**
 * Parses configuration from the environment without touching `process.env`, so
 * it can be tested in isolation. Throws `ConfigError` listing every problem.
 */
export function parseConfig(env: Env): Config {
  const problems: string[] = [];

  const port = parsePort(readEnv(env, "PORT", String(DEFAULT_PORT)), problems);
  const databaseUrl = parseDatabaseUrl(
    readEnv(env, "DATABASE_URL", DEFAULT_DATABASE_URL),
    problems,
  );
  const migrateOnStart = parseBoolean(
    "MIGRATE_ON_START",
    readEnv(env, "MIGRATE_ON_START", String(DEFAULT_MIGRATE_ON_START)),
    DEFAULT_MIGRATE_ON_START,
    problems,
  );
  const timeZone = parseTimeZone(readEnv(env, "OWNER_TIMEZONE", DEFAULT_OWNER_TIME_ZONE), problems);
  const start = parseTimeOfDay(
    "WORKING_HOURS_START",
    readEnv(env, "WORKING_HOURS_START", DEFAULT_WORKING_HOURS_START),
    problems,
  );
  const end = parseTimeOfDay(
    "WORKING_HOURS_END",
    readEnv(env, "WORKING_HOURS_END", DEFAULT_WORKING_HOURS_END),
    problems,
  );
  const workingDays = parseWorkingDays(
    readEnv(env, "WORKING_DAYS", DEFAULT_WORKING_DAYS),
    problems,
  );
  const webDist = readOptionalEnv(env, "WEB_DIST");

  if (start.parsed && end.parsed && Temporal.PlainTime.compare(start.value, end.value) >= 0) {
    problems.push("WORKING_HOURS_START must be before WORKING_HOURS_END");
  }

  if (problems.length > 0) {
    throw new ConfigError(problems);
  }

  return {
    port,
    databaseUrl,
    migrateOnStart,
    webDist,
    owner: {
      timeZone,
      workingHours: { start: start.value, end: end.value },
      workingDays,
    },
  };
}

/**
 * Loads `.env` and parses the process environment. This is the only entry point
 * that reads `process.env` for application settings.
 */
export function loadConfig(): Config {
  loadDotEnv();
  return parseConfig(process.env);
}
