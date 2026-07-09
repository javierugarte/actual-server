import { Provider } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ConnectionOptions, Queue } from "bullmq";
import IORedis from "ioredis";
import { FETCH_QUEUE } from "./queue.constants";

export const REDIS_CONNECTION = Symbol("REDIS_CONNECTION");
export const FETCH_QUEUE_PROVIDER = Symbol("FETCH_QUEUE_PROVIDER");

export const redisProvider: Provider = {
  provide: REDIS_CONNECTION,
  inject: [ConfigService],
  useFactory: (config: ConfigService) =>
    new IORedis(config.get<string>("REDIS_URL", "redis://localhost:6379"), {
      maxRetriesPerRequest: null
    })
};

export const fetchQueueProvider: Provider = {
  provide: FETCH_QUEUE_PROVIDER,
  inject: [REDIS_CONNECTION],
  useFactory: (connection: IORedis) =>
    new Queue(FETCH_QUEUE, {
      connection: connection as unknown as ConnectionOptions,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: { age: 86400, count: 1000 },
        removeOnFail: { age: 604800, count: 5000 }
      }
    })
};
