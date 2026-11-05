const MAX_CAUSE_DEPTH = 5;

/** True when the error, or one of its causes, is a PostgreSQL error with the given SQLSTATE. */
export function isPostgresError(error: unknown, code: string): boolean {
  let current: unknown = error;

  for (let depth = 0; depth < MAX_CAUSE_DEPTH; depth += 1) {
    if (typeof current !== "object" || current === null) {
      return false;
    }

    if ("code" in current && current.code === code) {
      return true;
    }

    current = "cause" in current ? current.cause : undefined;
  }

  return false;
}
