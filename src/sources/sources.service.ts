import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { CreateSourceDto } from "./dto/create-source.dto";
import { UpdateSourceDto } from "./dto/update-source.dto";

@Injectable()
export class SourcesService {
  constructor(private readonly database: DatabaseService) {}

  async createForUser(userId: string, dto: CreateSourceDto) {
    const normalizedUrl = dto.url.trim();
    const source = this.upsertSource(normalizedUrl, dto.label);

    try {
      const now = this.database.now();
      const id = this.database.id();
      this.database.db
        .prepare(
          `INSERT INTO user_sources (
            id, user_id, source_id, label, item_key_path, title_path, notify_on_first_run, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          id,
          userId,
          source.id,
          dto.label ?? null,
          dto.itemKeyPath ?? null,
          dto.titlePath ?? null,
          dto.notifyOnFirstRun ? 1 : 0,
          now,
          now
        );
      return this.findOwned(userId, id);
    } catch (error) {
      if (this.isUniqueError(error)) {
        throw new ConflictException("Source already exists for this user");
      }
      throw error;
    }
  }

  listForUser(userId: string) {
    const rows = this.database.db
      .prepare(
        `SELECT
          us.*,
          s.url AS source_url,
          s.name AS source_name,
          s.created_at AS source_created_at,
          s.updated_at AS source_updated_at
        FROM user_sources us
        JOIN sources s ON s.id = us.source_id
        WHERE us.user_id = ?
        ORDER BY us.created_at DESC`
      )
      .all(userId) as UserSourceRow[];

    return rows.map((row) => this.map(row));
  }

  async updateForUser(userId: string, id: string, dto: UpdateSourceDto) {
    await this.ensureOwned(userId, id);

    const current = this.findOwned(userId, id);
    this.database.db
      .prepare(
        `UPDATE user_sources
         SET label = ?, is_active = ?, item_key_path = ?, title_path = ?, notify_on_first_run = ?, updated_at = ?
         WHERE id = ? AND user_id = ?`
      )
      .run(
        dto.label ?? current.label,
        typeof dto.isActive === "boolean" ? Number(dto.isActive) : Number(current.isActive),
        dto.itemKeyPath ?? current.itemKeyPath,
        dto.titlePath ?? current.titlePath,
        typeof dto.notifyOnFirstRun === "boolean" ? Number(dto.notifyOnFirstRun) : Number(current.notifyOnFirstRun),
        this.database.now(),
        id,
        userId
      );

    return this.findOwned(userId, id);
  }

  async removeForUser(userId: string, id: string) {
    await this.ensureOwned(userId, id);
    this.database.db.prepare("DELETE FROM user_sources WHERE id = ? AND user_id = ?").run(id, userId);
    return { ok: true };
  }

  private async ensureOwned(userId: string, id: string) {
    const source = this.database.db.prepare("SELECT id FROM user_sources WHERE id = ? AND user_id = ?").get(id, userId);
    if (!source) {
      throw new NotFoundException("Source not found");
    }
  }

  private upsertSource(url: string, name?: string) {
    const existing = this.database.db.prepare("SELECT * FROM sources WHERE url = ?").get(url) as SourceRow | undefined;
    if (existing) {
      return existing;
    }

    const now = this.database.now();
    const id = this.database.id();
    this.database.db
      .prepare("INSERT INTO sources (id, url, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)")
      .run(id, url, name ?? null, now, now);
    return this.database.db.prepare("SELECT * FROM sources WHERE id = ?").get(id) as SourceRow;
  }

  private findOwned(userId: string, id: string) {
    const row = this.database.db
      .prepare(
        `SELECT
          us.*,
          s.url AS source_url,
          s.name AS source_name,
          s.created_at AS source_created_at,
          s.updated_at AS source_updated_at
        FROM user_sources us
        JOIN sources s ON s.id = us.source_id
        WHERE us.id = ? AND us.user_id = ?`
      )
      .get(id, userId) as UserSourceRow;
    return this.map(row);
  }

  private map(row: UserSourceRow) {
    return {
      id: row.id,
      userId: row.user_id,
      sourceId: row.source_id,
      label: row.label,
      isActive: Boolean(row.is_active),
      notifyOnFirstRun: Boolean(row.notify_on_first_run),
      itemKeyPath: row.item_key_path,
      titlePath: row.title_path,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      lastFetchedAt: row.last_fetched_at ? new Date(row.last_fetched_at) : null,
      source: {
        id: row.source_id,
        url: row.source_url,
        name: row.source_name,
        createdAt: new Date(row.source_created_at),
        updatedAt: new Date(row.source_updated_at)
      }
    };
  }

  private isUniqueError(error: unknown) {
    return typeof error === "object" && error !== null && "code" in error && error.code === "SQLITE_CONSTRAINT_UNIQUE";
  }
}

interface SourceRow {
  id: string;
  url: string;
  name: string | null;
}

interface UserSourceRow {
  id: string;
  user_id: string;
  source_id: string;
  label: string | null;
  is_active: number;
  notify_on_first_run: number;
  item_key_path: string | null;
  title_path: string | null;
  created_at: string;
  updated_at: string;
  last_fetched_at: string | null;
  source_url: string;
  source_name: string | null;
  source_created_at: string;
  source_updated_at: string;
}
