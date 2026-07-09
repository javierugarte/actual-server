import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AuthenticatedUser, CurrentUser } from "../common/current-user.decorator";
import { CreateSourceDto } from "./dto/create-source.dto";
import { UpdateSourceDto } from "./dto/update-source.dto";
import { SourcesService } from "./sources.service";

@ApiTags("sources")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("sources")
export class SourcesController {
  constructor(private readonly sources: SourcesService) {}

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateSourceDto) {
    return this.sources.createForUser(user.userId, dto);
  }

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.sources.listForUser(user.userId);
  }

  @Patch(":id")
  update(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: UpdateSourceDto) {
    return this.sources.updateForUser(user.userId, id, dto);
  }

  @Delete(":id")
  remove(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.sources.removeForUser(user.userId, id);
  }
}
