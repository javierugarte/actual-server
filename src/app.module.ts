import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "./auth/auth.module";
import { DatabaseModule } from "./database/database.module";
import { DevicesModule } from "./devices/devices.module";
import { JobsModule } from "./jobs/jobs.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { SourcesModule } from "./sources/sources.module";
import { UsersModule } from "./users/users.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    UsersModule,
    AuthModule,
    DevicesModule,
    SourcesModule,
    NotificationsModule,
    JobsModule
  ]
})
export class AppModule {}
