import { Module } from "@nestjs/common";
import { NotificationsModule } from "../notifications/notifications.module";
import { JobsController } from "./jobs.controller";
import { JobsSchedulerService } from "./scheduler.service";
import { JobsService } from "./jobs.service";
import { fetchQueueProvider, redisProvider } from "./queue.provider";
import { SourceFetcherService } from "./source-fetcher.service";
import { JobsWorkerService } from "./worker.service";

@Module({
  imports: [NotificationsModule],
  controllers: [JobsController],
  providers: [redisProvider, fetchQueueProvider, JobsService, SourceFetcherService, JobsWorkerService, JobsSchedulerService],
  exports: [JobsService, JobsWorkerService, JobsSchedulerService]
})
export class JobsModule {}
