import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { JobsSchedulerService } from "./jobs/scheduler.service";

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  app.enableShutdownHooks();
  app.get(JobsSchedulerService).start();
  new Logger("Scheduler").log("Scheduler registered");
}

void bootstrap();
