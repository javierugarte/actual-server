import { Inject, Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { ConnectionOptions, Job, Worker } from "bullmq";
import IORedis from "ioredis";
import { FetchJobName, FETCH_QUEUE } from "./queue.constants";
import { REDIS_CONNECTION } from "./queue.provider";
import { SourceFetcherService } from "./source-fetcher.service";

@Injectable()
export class JobsWorkerService implements OnModuleDestroy {
  private readonly logger = new Logger(JobsWorkerService.name);
  private worker?: Worker;

  constructor(
    @Inject(REDIS_CONNECTION) private readonly connection: IORedis,
    private readonly fetcher: SourceFetcherService
  ) {}

  start() {
    if (this.worker) {
      return;
    }

    this.worker = new Worker(
      FETCH_QUEUE,
      async (job) => this.process(job),
      {
        connection: this.connection as unknown as ConnectionOptions,
        concurrency: 5
      }
    );

    this.worker.on("completed", (job) => this.logger.log(`Completed ${job.name} ${job.id}`));
    this.worker.on("failed", (job, error) => this.logger.error(`Failed ${job?.name} ${job?.id}: ${error.message}`));
  }

  async onModuleDestroy() {
    await this.worker?.close();
  }

  private process(job: Job) {
    if (job.name === FetchJobName.FetchAll) {
      return this.fetcher.fetchAll();
    }

    if (job.name === FetchJobName.FetchUserSource) {
      return this.fetcher.fetchUserSource(job.data.userSourceId);
    }

    throw new Error(`Unknown job: ${job.name}`);
  }
}
