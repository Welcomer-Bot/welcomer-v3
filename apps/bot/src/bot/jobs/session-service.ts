export interface SessionRepository {
  deleteEndedSessions(now: Date): Promise<void>;
  deleteUsersWithoutSession(createdBefore: Date): Promise<void>;
}

// A user created within this delay may be between Better Auth's user and session inserts (D14).
const SIGN_IN_GRACE_MS = 60_000;

export const createSessionJob =
  (repository: SessionRepository, clock: () => Date) => async () => {
    const now = clock();
    await repository.deleteEndedSessions(now);
    await repository.deleteUsersWithoutSession(
      new Date(now.getTime() - SIGN_IN_GRACE_MS),
    );
  };
