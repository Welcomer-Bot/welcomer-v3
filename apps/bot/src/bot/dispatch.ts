let collecting: Promise<unknown>[] | undefined;

// discordeno calls each event without awaiting it, so events hand their promise here.
export const track = <T>(promise: Promise<T>): Promise<T> => {
  collecting?.push(promise);
  return promise;
};

// discordeno's handlers call events synchronously, so every tracked promise is collected before dispatch returns.
export const dispatchAndWait = (
  dispatch: () => void,
): Promise<PromiseSettledResult<unknown>[]> => {
  const pending: Promise<unknown>[] = [];
  collecting = pending;
  try {
    dispatch();
  } finally {
    collecting = undefined;
  }
  return Promise.allSettled(pending);
};
