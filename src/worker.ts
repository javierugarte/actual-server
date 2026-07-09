import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { JobsWorkerService } from "./jobs/worker.service";

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  app.enableShutdownHooks();
  app.get(JobsWorkerService).start();
  new Logger("Worker").log("Source fetch worker started");
}

void bootstrap();
