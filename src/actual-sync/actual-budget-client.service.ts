import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ActualAccountRow } from "../actual-accounts/actual-accounts.service";

export interface ActualTransaction {
  id: string;
  account?: string;
  date?: string;
  amount?: number;
  payee?: string | null;
  imported_payee?: string | null;
  [key: string]: unknown;
}

@Injectable()
export class ActualBudgetClientService {
  constructor(private readonly config: ConfigService) {}

  async syncAccount(account: ActualAccountRow) {
    await this.request(account, `/budgets/${encodeURIComponent(account.budget_sync_id)}/accounts/${encodeURIComponent(account.account_id)}/banksync`, {
      method: "POST"
    });
  }

  async fetchAllTransactions(account: ActualAccountRow) {
    const sinceDate = this.config.get<string>("ACTUAL_TRANSACTIONS_SINCE_DATE", "1900-01-01");
    const limit = this.config.get<number>("ACTUAL_TRANSACTIONS_PAGE_LIMIT", 100);
    const transactions: ActualTransaction[] = [];

    for (let page = 1; ; page += 1) {
      const search = new URLSearchParams({
        since_date: sinceDate,
        page: String(page),
        limit: String(limit)
      });

      const response = await this.request<{ data: ActualTransaction[] }>(
        account,
        `/budgets/${encodeURIComponent(account.budget_sync_id)}/accounts/${encodeURIComponent(account.account_id)}/transactions?${search.toString()}`
      );
      const pageItems = response.data ?? [];
      transactions.push(...pageItems);

      if (pageItems.length < limit) {
        break;
      }
    }

    return transactions;
  }

  private async request<T = unknown>(account: ActualAccountRow, path: string, init?: RequestInit): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.get<number>("FETCH_TIMEOUT_MS", 15000));

    try {
      const response = await fetch(`${account.base_url}${path}`, {
        ...init,
        signal: controller.signal,
        headers: {
          accept: "application/json",
          "x-api-key": account.api_key,
          ...(account.budget_encryption_password ? { "budget-encryption-password": account.budget_encryption_password } : {}),
          ...init?.headers
        }
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Actual API ${response.status}: ${body}`);
      }

      return (await response.json()) as T;
    } finally {
      clearTimeout(timeout);
    }
  }
}
