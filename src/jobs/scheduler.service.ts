import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Queue } from "bullmq";
import { FETCH_QUEUE_PROVIDER } from "./queue.provider";
import { FetchJobName } from "./queue.constants";

@Injectable()
export class JobsSchedulerService {
  private readonly logger = new Logger(JobsSchedulerService.name);

  constructor(
    @Inject(FETCH_QUEUE_PROVIDER) private readonly queue: Queue,
    private readonly config: ConfigService
  ) {}

  async start() {
    const pattern = this.config.get<string>("FETCH_CRON", "0 8 * * *");
    const tz = this.config.get<string>("FETCH_TIMEZONE", "Europe/Madrid");

    await this.queue.upsertJobScheduler(
      "daily-source-fetch",
      { pattern, tz },
      {
        name: FetchJobName.FetchAll,
        data: {},
        opts: { attempts: 3 }
      }
    );

    this.logger.log(`Scheduled ${FetchJobName.FetchAll} with cron "${pattern}" (${tz})`);
  }
}
