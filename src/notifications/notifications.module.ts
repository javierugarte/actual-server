import { Module } from "@nestjs/common";
import { DevicesModule } from "../devices/devices.module";
import { ApnsService } from "./apns.service";
import { NotificationsService } from "./notifications.service";

@Module({
  imports: [DevicesModule],
  providers: [ApnsService, NotificationsService],
  exports: [NotificationsService]
})
export class NotificationsModule {}
