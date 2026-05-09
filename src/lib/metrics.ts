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

export type SurveyResponse = {
  wouldPay: string;
  price: string;
  source?: string;
  createdAt?: string;
};

const METRICS_PREFIX = "@shuhari:metrics";
const SURVEY_PREFIX = "@shuhari:survey";
const LOCAL_DATA_DIR = "data";
const LOCAL_EVENTS_FILE = "leads.jsonl";
const LOCAL_SURVEY_FILE = "survey.jsonl";

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;

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

async function appendLocalJsonLine(fileName: string, value: unknown) {
  const dataDirectory = path.join(process.cwd(), LOCAL_DATA_DIR);
  await mkdir(dataDirectory, { recursive: true });
  await appendFile(
    path.join(dataDirectory, fileName),
    `${JSON.stringify(value)}\n`,
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

  await appendLocalJsonLine(LOCAL_EVENTS_FILE, event);
}

export async function recordSurveyResponse(input: SurveyResponse) {
  const response = {
    ...input,
    createdAt: input.createdAt ?? new Date().toISOString(),
  };

  const redis = getRedis();

  if (redis) {
    await Promise.all([
      redis.incr(`${SURVEY_PREFIX}:count`),
      redis.lpush(`${SURVEY_PREFIX}:responses`, response),
      redis.hincrby(`${METRICS_PREFIX}:totals`, "survey_submitted", 1),
      redis.hincrby(`${METRICS_PREFIX}:daily:${todayKey()}`, "survey_submitted", 1),
      redis.lpush(`${METRICS_PREFIX}:recent`, {
        event: "survey_submitted",
        source: input.source ?? "landing_survey",
        createdAt: response.createdAt,
      }),
    ]);
    await Promise.all([
      redis.ltrim(`${SURVEY_PREFIX}:responses`, 0, 199),
      redis.ltrim(`${METRICS_PREFIX}:recent`, 0, 49),
    ]);
    return;
  }

  try {
    await appendLocalJsonLine(LOCAL_SURVEY_FILE, response);
  } catch {
    console.info("Survey response captured without durable storage", response);
  }
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
