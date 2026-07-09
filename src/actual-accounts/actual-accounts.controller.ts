import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AuthenticatedUser, CurrentUser } from "../common/current-user.decorator";
import { ActualAccountsService } from "./actual-accounts.service";
import { CreateActualAccountDto } from "./dto/create-actual-account.dto";
import { UpdateActualAccountDto } from "./dto/update-actual-account.dto";

@ApiTags("actual-accounts")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("actual-accounts")
export class ActualAccountsController {
  constructor(private readonly actualAccounts: ActualAccountsService) {}

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateActualAccountDto) {
    return this.actualAccounts.create(user.userId, dto);
  }

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.actualAccounts.list(user.userId);
  }

  @Patch(":id")
  update(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: UpdateActualAccountDto) {
    return this.actualAccounts.update(user.userId, id, dto);
  }

  @Delete(":id")
  remove(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.actualAccounts.remove(user.userId, id);
  }
}
