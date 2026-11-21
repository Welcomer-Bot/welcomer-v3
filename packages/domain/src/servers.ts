export interface Server {
  id: string;
  name: string;
  memberCount: number;
  icon: string | null;
}

export type ServerCountEvent =
  | { type: "ready"; ids: string[] }
  | { type: "create"; id: string }
  | { type: "delete"; id: string; unavailable: boolean };

export const countServers = (
  ids: Set<string>,
  event: ServerCountEvent,
): Set<string> => {
  switch (event.type) {
    case "ready":
      return new Set(event.ids);
    case "create":
      return new Set(ids).add(event.id);
    case "delete": {
      if (event.unavailable) return ids;
      const next = new Set(ids);
      next.delete(event.id);
      return next;
    }
  }
};
