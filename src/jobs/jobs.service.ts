import { Injectable } from "@nestjs/common";
import { ActualSyncService } from "../actual-sync/actual-sync.service";

@Injectable()
export class JobsService {
  constructor(private readonly actualSync: ActualSyncService) {}

  runFetchAll() {
    return this.actualSync.syncAllActiveAccounts();
  }

  runFetchUserSource(actualAccountId: string) {
    return this.actualSync.syncAccountById(actualAccountId);
  }
}
