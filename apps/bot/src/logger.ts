import { pino } from "pino";

export const createLogger = (service: string, level: string) =>
  pino({ level, base: { service } });
