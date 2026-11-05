/** Returns the current instant. Injecting it keeps handlers and tests deterministic. */
export type Clock = () => Date;

export const systemClock: Clock = () => new Date();
