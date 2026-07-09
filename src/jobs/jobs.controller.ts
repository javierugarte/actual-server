import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { ApiHeader, ApiTags } from "@nestjs/swagger";
import { AdminApiKeyGuard } from "../common/admin-api-key.guard";
import { JobsService } from "./jobs.service";

@ApiTags("jobs")
@ApiHeader({ name: "x-admin-api-key" })
@UseGuards(AdminApiKeyGuard)
@Controller("jobs")
export class JobsController {
  constructor(private readonly jobs: JobsService) {}

  @Post("run-now")
  runNow(@Body() body: { userSourceId?: string }) {
    if (body.userSourceId) {
      return this.jobs.runFetchUserSource(body.userSourceId);
    }
    return this.jobs.runFetchAll();
  }
}
