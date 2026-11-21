const HOUR_MS = 3_600_000;

export const runHourly = (
  job: () => Promise<void>,
  logger: { error: (data: { err: unknown }, message: string) => void },
) => {
  const run = () =>
    job().catch((err: unknown) => {
      logger.error({ err }, "Scheduled job failed");
    });
  void run();
  setInterval(() => {
    void run();
  }, HOUR_MS);
};
