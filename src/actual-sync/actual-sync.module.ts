import { Module } from "@nestjs/common";
import { ActualAccountsModule } from "../actual-accounts/actual-accounts.module";
import { ActualBudgetClientService } from "./actual-budget-client.service";
import { ActualSyncService } from "./actual-sync.service";
import { ActualTransactionsController } from "./actual-transactions.controller";

@Module({
  imports: [ActualAccountsModule],
  controllers: [ActualTransactionsController],
  providers: [ActualBudgetClientService, ActualSyncService],
  exports: [ActualSyncService]
})
export class ActualSyncModule {}
