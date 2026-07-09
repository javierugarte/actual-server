import { Module } from "@nestjs/common";
import { NotificationsModule } from "../notifications/notifications.module";
import { JobsController } from "./jobs.controller";
import { JobsSchedulerService } from "./scheduler.service";
import { JobsService } from "./jobs.service";
import { SourceFetcherService } from "./source-fetcher.service";

@Module({
  imports: [NotificationsModule],
  controllers: [JobsController],
  providers: [JobsService, SourceFetcherService, JobsSchedulerService],
  exports: [JobsService, JobsSchedulerService]
})
export class JobsModule {}
