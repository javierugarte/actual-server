import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiQuery, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AuthenticatedUser, CurrentUser } from "../common/current-user.decorator";
import { ActualSyncService } from "./actual-sync.service";

@ApiTags("actual-transactions")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("actual-transactions")
export class ActualTransactionsController {
  constructor(private readonly actualSync: ActualSyncService) {}

  @Get("new")
  @ApiQuery({ name: "actualAccountId", required: false })
  @ApiQuery({ name: "limit", required: false })
  @ApiQuery({ name: "includeAcknowledged", required: false })
  listNew(
    @CurrentUser() user: AuthenticatedUser,
    @Query("actualAccountId") actualAccountId?: string,
    @Query("limit") limit?: string,
    @Query("includeAcknowledged") includeAcknowledged?: string
  ) {
    return this.actualSync.listNewTransactions(user.userId, {
      actualAccountId,
      limit: limit ? Number(limit) : undefined,
      includeAcknowledged: includeAcknowledged === "true"
    });
  }
}
