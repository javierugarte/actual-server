import { Module } from "@nestjs/common";
import { ActualSyncModule } from "../actual-sync/actual-sync.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { JobsController } from "./jobs.controller";
import { JobsSchedulerService } from "./scheduler.service";
import { JobsService } from "./jobs.service";

@Module({
  imports: [ActualSyncModule, NotificationsModule],
  controllers: [JobsController],
  providers: [JobsService, JobsSchedulerService],
  exports: [JobsService, JobsSchedulerService]
})
export class JobsModule {}
