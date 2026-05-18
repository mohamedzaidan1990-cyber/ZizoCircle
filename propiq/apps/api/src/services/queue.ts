import { Queue, Worker, type ConnectionOptions } from "bullmq";
import IORedis from "ioredis";
import { env } from "../lib/env";

const url = new URL(env.REDIS_URL);
export const redisConnection: ConnectionOptions = {
  host: url.hostname,
  port: Number(url.port) || 6379,
  password: url.password || undefined,
  // BullMQ requirement
  maxRetriesPerRequest: null,
};

/** Singleton ioredis instance for ad-hoc commands (subscriptions, etc.). */
let cachedClient: IORedis | null = null;
export function redis(): IORedis {
  if (cachedClient) return cachedClient;
  cachedClient = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });
  return cachedClient;
}

export const QUEUE_NAMES = {
  emailSequence: "email-sequence",
  propifyCampaigns: "propify-campaigns",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

const queues = new Map<QueueName, Queue>();

export function getQueue(name: QueueName): Queue {
  let q = queues.get(name);
  if (!q) {
    q = new Queue(name, { connection: redisConnection });
    queues.set(name, q);
  }
  return q;
}

const workers: Worker[] = [];

export function registerWorker(worker: Worker) {
  workers.push(worker);
}

export async function shutdownQueues(): Promise<void> {
  await Promise.all(workers.map((w) => w.close()));
  await Promise.all(Array.from(queues.values()).map((q) => q.close()));
  if (cachedClient) await cachedClient.quit();
}
