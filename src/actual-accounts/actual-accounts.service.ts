import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { CreateActualAccountDto } from "./dto/create-actual-account.dto";
import { UpdateActualAccountDto } from "./dto/update-actual-account.dto";

@Injectable()
export class ActualAccountsService {
  constructor(private readonly database: DatabaseService) {}

  create(userId: string, dto: CreateActualAccountDto) {
    const now = this.database.now();
    const id = this.database.id();

    try {
      this.database.db
        .prepare(
          `INSERT INTO actual_accounts (
            id, user_id, name, base_url, api_key, budget_sync_id, account_id,
            budget_encryption_password, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          id,
          userId,
          dto.name,
          normalizeBaseUrl(dto.baseUrl),
          dto.apiKey,
          dto.budgetSyncId,
          dto.accountId,
          dto.budgetEncryptionPassword ?? null,
          now,
          now
        );
    } catch (error) {
      if (isUniqueError(error)) {
        throw new ConflictException("Actual account already exists for this user and budget");
      }
      throw error;
    }

    return this.findForUser(userId, id);
  }

  list(userId: string) {
    const rows = this.database.db
      .prepare("SELECT * FROM actual_accounts WHERE user_id = ? ORDER BY created_at DESC")
      .all(userId) as ActualAccountRow[];
    return rows.map(mapActualAccount);
  }

  findForUser(userId: string, id: string) {
    return mapActualAccount(this.findRowForUser(userId, id));
  }

  update(userId: string, id: string, dto: UpdateActualAccountDto) {
    const current = this.findRowForUser(userId, id);
    const now = this.database.now();

    try {
      this.database.db
        .prepare(
          `UPDATE actual_accounts
           SET name = ?, base_url = ?, api_key = ?, budget_sync_id = ?, account_id = ?,
               budget_encryption_password = ?, is_active = ?, updated_at = ?
           WHERE id = ? AND user_id = ?`
        )
        .run(
          dto.name ?? current.name,
          dto.baseUrl ? normalizeBaseUrl(dto.baseUrl) : current.base_url,
          dto.apiKey ?? current.api_key,
          dto.budgetSyncId ?? current.budget_sync_id,
          dto.accountId ?? current.account_id,
          dto.budgetEncryptionPassword ?? current.budget_encryption_password,
          typeof dto.isActive === "boolean" ? Number(dto.isActive) : Number(current.is_active),
          now,
          id,
          userId
        );
    } catch (error) {
      if (isUniqueError(error)) {
        throw new ConflictException("Actual account already exists for this user and budget");
      }
      throw error;
    }

    return this.findForUser(userId, id);
  }

  remove(userId: string, id: string) {
    const result = this.database.db.prepare("DELETE FROM actual_accounts WHERE id = ? AND user_id = ?").run(id, userId);
    if (result.changes === 0) {
      throw new NotFoundException("Actual account not found");
    }
    return { ok: true };
  }

  private findRowForUser(userId: string, id: string) {
    const row = this.database.db.prepare("SELECT * FROM actual_accounts WHERE id = ? AND user_id = ?").get(id, userId) as
      | ActualAccountRow
      | undefined;

    if (!row) {
      throw new NotFoundException("Actual account not found");
    }

    return row;
  }
}

export interface ActualAccountRow {
  id: string;
  user_id: string;
  name: string;
  base_url: string;
  api_key: string;
  budget_sync_id: string;
  account_id: string;
  budget_encryption_password: string | null;
  is_active: number;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export function mapActualAccount(row: ActualAccountRow) {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    baseUrl: row.base_url,
    apiKey: "redacted",
    budgetSyncId: row.budget_sync_id,
    accountId: row.account_id,
    budgetEncryptionPassword: row.budget_encryption_password ? "redacted" : null,
    isActive: Boolean(row.is_active),
    lastSyncedAt: row.last_synced_at ? new Date(row.last_synced_at) : null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  };
}

function normalizeBaseUrl(value: string) {
  return value.replace(/\/+$/, "");
}

function isUniqueError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "SQLITE_CONSTRAINT_UNIQUE";
}
