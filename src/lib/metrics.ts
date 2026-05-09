import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { Redis } from "@upstash/redis";

export type MetricEvent = {
  event: string;
  email?: string;
  name?: string;
  season?: string;
  source?: string;
  createdAt?: string;
};

export type MetricsSnapshot = {
  totals: Record<string, number>;
  today: Record<string, number>;
  recent: MetricEvent[];
  storage: "upstash" | "local-fallback";
};

const METRICS_PREFIX = "@shuhari:metrics";
const LOCAL_DATA_DIR = "data";
const LOCAL_EVENTS_FILE = "leads.jsonl";

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return null;
  }

  return new Redis({ url, token });
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeCounts(counts: Record<string, unknown> | null): Record<string, number> {
  if (!counts) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(counts).map(([key, value]) => [key, Number(value) || 0]),
  );
}

async function appendLocalEvent(event: MetricEvent) {
  const dataDirectory = path.join(process.cwd(), LOCAL_DATA_DIR);
  await mkdir(dataDirectory, { recursive: true });
  await appendFile(
    path.join(dataDirectory, LOCAL_EVENTS_FILE),
    `${JSON.stringify(event)}\n`,
    "utf8",
  );
}

export async function recordMetric(input: MetricEvent) {
  const event = {
    ...input,
    event: input.event || "lead",
    createdAt: input.createdAt ?? new Date().toISOString(),
  };

  const redis = getRedis();

  if (redis) {
    await Promise.all([
      redis.hincrby(`${METRICS_PREFIX}:totals`, event.event, 1),
      redis.hincrby(`${METRICS_PREFIX}:daily:${todayKey()}`, event.event, 1),
      redis.lpush(`${METRICS_PREFIX}:recent`, event),
    ]);
    await redis.ltrim(`${METRICS_PREFIX}:recent`, 0, 49);
    return;
  }

  await appendLocalEvent(event);
}

export async function getMetricsSnapshot(): Promise<MetricsSnapshot> {
  const redis = getRedis();

  if (!redis) {
    return {
      totals: {},
      today: {},
      recent: [],
      storage: "local-fallback",
    };
  }

  const [totals, today, recent] = await Promise.all([
    redis.hgetall<Record<string, unknown>>(`${METRICS_PREFIX}:totals`),
    redis.hgetall<Record<string, unknown>>(`${METRICS_PREFIX}:daily:${todayKey()}`),
    redis.lrange<MetricEvent>(`${METRICS_PREFIX}:recent`, 0, 19),
  ]);

  return {
    totals: normalizeCounts(totals),
    today: normalizeCounts(today),
    recent,
    storage: "upstash",
  };
}
