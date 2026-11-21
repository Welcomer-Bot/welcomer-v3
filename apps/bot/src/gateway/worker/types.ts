import type { ShardStatus } from "@repo/domain";

export type ManagerMessage =
  | ManagerRequestIdentify
  | ManagerShardIdentified
  | ManagerShardPrepared
  | ManagerShardStatuses;
export type WorkerMessage =
  | WorkerIdentifyShard
  | WorkerPrepareShard
  | WorkerSwitchShards
  | WorkerAllowIdentify;

export interface WorkerIdentifyShard {
  type: "IdentifyShard";
  shardId: number;
}

export interface WorkerPrepareShard {
  type: "PrepareShard";
  shardId: number;
  totalShards: number;
}

export interface WorkerSwitchShards {
  type: "SwitchShards";
}

export interface WorkerAllowIdentify {
  type: "AllowIdentify";
  shardId: number;
}

export interface ManagerRequestIdentify {
  type: "RequestIdentify";
  shardId: number;
}

export interface WorkerCreateData {
  connectionData: {
    intents: number;
    token: string;
    url: string;
    version: number;
    totalShards: number;
  };
  workerId: number;
  logLevel: string;
  rabbitMQUrl: string;
}

export interface ManagerShardIdentified {
  type: "ShardIdentified";
  shardId: number;
}

export interface ManagerShardStatuses {
  type: "ShardStatuses";
  statuses: Omit<ShardStatus, "updatedAt">[];
}

export interface ManagerShardPrepared {
  type: "ShardPrepared";
  shardId: number;
}
