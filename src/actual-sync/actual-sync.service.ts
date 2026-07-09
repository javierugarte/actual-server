import { Injectable, Logger } from "@nestjs/common";
import { ActualAccountRow, mapActualAccount } from "../actual-accounts/actual-accounts.service";
import { DatabaseService } from "../database/database.service";
import { ActualBudgetClientService, ActualTransaction } from "./actual-budget-client.service";

@Injectable()
export class ActualSyncService {
  private readonly logger = new Logger(ActualSyncService.name);

  constructor(
    private readonly database: DatabaseService,
    private readonly actualClient: ActualBudgetClientService
  ) {}

  async syncAllActiveAccounts() {
    const accounts = this.database.db
      .prepare("SELECT * FROM actual_accounts WHERE is_active = 1 ORDER BY created_at ASC")
      .all() as ActualAccountRow[];
    const results = [];

    for (const account of accounts) {
      results.push(await this.syncConfiguredAccount(account));
    }

    return {
      processed: accounts.length,
      results
    };
  }

  async syncAccountById(id: string) {
    const account = this.database.db.prepare("SELECT * FROM actual_accounts WHERE id = ?").get(id) as ActualAccountRow | undefined;
    if (!account || !account.is_active) {
      return { skipped: true };
    }
    return this.syncConfiguredAccount(account);
  }

  listNewTransactions(userId: string, filters: { actualAccountId?: string; limit?: number; includeAcknowledged?: boolean }) {
    const limit = Math.min(Math.max(filters.limit ?? 100, 1), 500);
    const params: unknown[] = [userId];
    const clauses = ["nat.user_id = ?"];

    if (filters.actualAccountId) {
      clauses.push("nat.actual_account_id = ?");
      params.push(filters.actualAccountId);
    }

    if (!filters.includeAcknowledged) {
      clauses.push("nat.acknowledged_at IS NULL");
    }

    params.push(limit);

    const rows = this.database.db
      .prepare(
        `SELECT
          nat.*,
          aa.name AS account_name,
          aa.budget_sync_id AS budget_sync_id,
          aa.account_id AS actual_account_remote_id
        FROM new_actual_transactions nat
        JOIN actual_accounts aa ON aa.id = nat.actual_account_id
        WHERE ${clauses.join(" AND ")}
        ORDER BY nat.detected_at DESC
        LIMIT ?`
      )
      .all(...params) as NewTransactionRow[];

    return rows.map((row) => ({
      id: row.id,
      actualAccountId: row.actual_account_id,
      actualTransactionId: row.transaction_id,
      detectedAt: new Date(row.detected_at),
      acknowledgedAt: row.acknowledged_at ? new Date(row.acknowledged_at) : null,
      account: {
        name: row.account_name,
        budgetSyncId: row.budget_sync_id,
        accountId: row.actual_account_remote_id
      },
      transaction: this.database.json<ActualTransaction>(row.raw)
    }));
  }

  private async syncConfiguredAccount(account: ActualAccountRow) {
    this.logger.log(`Syncing Actual account ${account.name} (${account.account_id})`);
    const firstRun = account.last_synced_at === null;

    await this.actualClient.syncAccount(account);
    const transactions = await this.actualClient.fetchAllTransactions(account);
    const saved = this.saveTransactions(account, transactions, firstRun);

    this.database.db
      .prepare("UPDATE actual_accounts SET last_synced_at = ?, updated_at = ? WHERE id = ?")
      .run(this.database.now(), this.database.now(), account.id);

    return {
      account: mapActualAccount(account),
      fetched: transactions.length,
      newTransactions: saved.newTransactions,
      baselineOnly: firstRun
    };
  }

  private saveTransactions(account: ActualAccountRow, transactions: ActualTransaction[], baselineOnly: boolean) {
    const insertSeen = this.database.db.prepare(
      `INSERT INTO actual_transactions (
        id, actual_account_id, transaction_id, date, amount, imported_payee, payee, raw, first_seen_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const updateSeen = this.database.db.prepare(
      `UPDATE actual_transactions
       SET date = ?, amount = ?, imported_payee = ?, payee = ?, raw = ?, updated_at = ?
       WHERE actual_account_id = ? AND transaction_id = ?`
    );
    const insertNew = this.database.db.prepare(
      `INSERT OR IGNORE INTO new_actual_transactions (
        id, user_id, actual_account_id, transaction_id, raw, detected_at
      ) VALUES (?, ?, ?, ?, ?, ?)`
    );
    const existsSeen = this.database.db.prepare(
      "SELECT id FROM actual_transactions WHERE actual_account_id = ? AND transaction_id = ?"
    );

    const now = this.database.now();
    let newTransactions = 0;

    const run = this.database.db.transaction((items: ActualTransaction[]) => {
      for (const transaction of items) {
        if (!transaction.id) {
          continue;
        }

        const raw = JSON.stringify(transaction);
        const existing = existsSeen.get(account.id, transaction.id);

        if (!existing) {
          insertSeen.run(
            this.database.id(),
            account.id,
            transaction.id,
            transaction.date ?? null,
            typeof transaction.amount === "number" ? transaction.amount : null,
            transaction.imported_payee ?? null,
            transaction.payee ?? null,
            raw,
            now,
            now
          );

          if (!baselineOnly) {
            const result = insertNew.run(this.database.id(), account.user_id, account.id, transaction.id, raw, now);
            newTransactions += result.changes;
          }
        } else {
          updateSeen.run(
            transaction.date ?? null,
            typeof transaction.amount === "number" ? transaction.amount : null,
            transaction.imported_payee ?? null,
            transaction.payee ?? null,
            raw,
            now,
            account.id,
            transaction.id
          );
        }
      }
    });

    run(transactions);
    return { newTransactions };
  }
}

interface NewTransactionRow {
  id: string;
  actual_account_id: string;
  transaction_id: string;
  raw: string;
  detected_at: string;
  acknowledged_at: string | null;
  account_name: string;
  budget_sync_id: string;
  actual_account_remote_id: string;
}
