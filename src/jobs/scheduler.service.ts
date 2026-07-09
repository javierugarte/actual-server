import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import cron, { ScheduledTask } from "node-cron";
import { ActualSyncService } from "../actual-sync/actual-sync.service";

@Injectable()
export class JobsSchedulerService implements OnModuleDestroy {
  private readonly logger = new Logger(JobsSchedulerService.name);
  private task?: ScheduledTask;

  constructor(
    private readonly actualSync: ActualSyncService,
    private readonly config: ConfigService
  ) {}

  start() {
    const pattern = this.config.get<string>("FETCH_CRON", "0 8 * * *");
    const tz = this.config.get<string>("FETCH_TIMEZONE", "Europe/Madrid");

    if (this.task) {
      return;
    }

    this.task = cron.schedule(
      pattern,
      async () => {
        try {
          await this.actualSync.syncAllActiveAccounts();
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown scheduler error";
          this.logger.error(`Scheduled fetch failed: ${message}`);
        }
      },
      { timezone: tz }
    );

    this.logger.log(`Scheduled Actual account sync with cron "${pattern}" (${tz})`);
  }

  onModuleDestroy() {
    this.task?.stop();
  }
}
