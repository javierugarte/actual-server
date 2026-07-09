import { Module } from "@nestjs/common";
import { ActualAccountsController } from "./actual-accounts.controller";
import { ActualAccountsService } from "./actual-accounts.service";

@Module({
  controllers: [ActualAccountsController],
  providers: [ActualAccountsService],
  exports: [ActualAccountsService]
})
export class ActualAccountsModule {}
