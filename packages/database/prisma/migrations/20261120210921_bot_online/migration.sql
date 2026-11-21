-- CreateEnum
CREATE TYPE "shard_state" AS ENUM ('online', 'connecting', 'offline');

-- CreateTable
CREATE TABLE "server" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "member_count" INTEGER NOT NULL,
    "icon" TEXT,
    "bot_joined_at" TIMESTAMPTZ NOT NULL,
    "recorded_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "server_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shard_status" (
    "shard_id" INTEGER NOT NULL,
    "state" "shard_state" NOT NULL,
    "latency_ms" INTEGER,
    "server_count" INTEGER NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "shard_status_pkey" PRIMARY KEY ("shard_id")
);

-- CreateTable
CREATE TABLE "bot_status" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "started_at" TIMESTAMPTZ NOT NULL,
    "shard_count" INTEGER NOT NULL,

    CONSTRAINT "bot_status_pkey" PRIMARY KEY ("id")
);
