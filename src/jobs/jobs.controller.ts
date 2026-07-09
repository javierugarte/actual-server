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
  runNow(@Body() body: { actualAccountId?: string }) {
    if (body.actualAccountId) {
      return this.jobs.runFetchUserSource(body.actualAccountId);
    }
    return this.jobs.runFetchAll();
  }
}
