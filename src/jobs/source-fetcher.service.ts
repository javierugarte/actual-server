import { createHash } from "crypto";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DatabaseService } from "../database/database.service";
import { NotificationsService } from "../notifications/notifications.service";

type JsonValue = Record<string, unknown> | unknown[];

interface FetchContext {
  userId: string;
  userSourceId: string;
  sourceId: string;
  sourceUrl: string;
  label?: string | null;
  lastFetchedAt?: Date | null;
  itemKeyPath?: string | null;
  titlePath?: string | null;
}

@Injectable()
export class SourceFetcherService {
  private readonly logger = new Logger(SourceFetcherService.name);

  constructor(
    private readonly database: DatabaseService,
    private readonly config: ConfigService,
    private readonly notifications: NotificationsService
  ) {}

  async fetchAll() {
    const subscriptions = this.database.db.prepare("SELECT id FROM user_sources WHERE is_active = 1").all() as Array<{ id: string }>;

    for (const subscription of subscriptions) {
      await this.fetchUserSource(subscription.id);
    }

    return { processed: subscriptions.length };
  }

  async fetchUserSource(userSourceId: string) {
    const userSource = this.findUserSource(userSourceId);

    if (!userSource || !userSource.is_active) {
      return { skipped: true };
    }

    const fetchRunId = this.createFetchRun(userSourceId);

    try {
      const rawItems = await this.fetchItems({
        userId: userSource.user_id,
        userSourceId,
        sourceId: userSource.source_id,
        sourceUrl: userSource.source_url,
        label: userSource.label,
        lastFetchedAt: userSource.last_fetched_at ? new Date(userSource.last_fetched_at) : null,
        itemKeyPath: userSource.item_key_path,
        titlePath: userSource.title_path
      });
      const firstRun = userSource.last_fetched_at === null;
      const newItems: Array<{ title?: string; raw: unknown; fingerprint: string }> = [];

      for (const raw of rawItems) {
        const fingerprint = this.fingerprint(raw, userSource.item_key_path);
        const title = this.title(raw, userSource.title_path);
        const created = await this.insertItem(userSourceId, fingerprint, raw, title);
        if (created) {
          newItems.push({ title, raw, fingerprint });
        }
      }

      this.database.db
        .prepare("UPDATE user_sources SET last_fetched_at = ?, updated_at = ? WHERE id = ?")
        .run(this.database.now(), this.database.now(), userSourceId);

      this.updateFetchRun(fetchRunId, "SUCCESS", newItems.length);

      if (newItems.length > 0 && (!firstRun || userSource.notify_on_first_run)) {
        await this.notifications.notifyNewItems({
          userId: userSource.user_id,
          userSourceId,
          sourceLabel: userSource.label ?? userSource.source_name ?? userSource.source_url,
          newItemCount: newItems.length,
          itemTitles: newItems.map((item) => item.title).filter((title): title is string => Boolean(title))
        });
      }

      return { newItemCount: newItems.length };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown fetch error";
      this.logger.error(`Fetch failed for ${userSource.source_url}: ${message}`);
      this.updateFetchRun(fetchRunId, "FAILED", 0, message);
      throw error;
    }
  }

  private async fetchItems(context: FetchContext) {
    const url = this.config.get<string>("DATA_SERVICE_URL");
    if (!url) {
      throw new Error("Missing DATA_SERVICE_URL");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.get<number>("FETCH_TIMEOUT_MS", 15000));

    try {
      const response = await fetch(url, {
        method: "POST",
        signal: controller.signal,
        headers: {
          accept: "application/json, text/plain;q=0.9, */*;q=0.8",
          "content-type": "application/json"
        },
        body: JSON.stringify({
          userId: context.userId,
          userSourceId: context.userSourceId,
          sourceId: context.sourceId,
          sourceUrl: context.sourceUrl,
          label: context.label,
          lastFetchedAt: context.lastFetchedAt?.toISOString() ?? null,
          itemKeyPath: context.itemKeyPath,
          titlePath: context.titlePath
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const contentType = response.headers.get("content-type") ?? "";
      const data = contentType.includes("application/json") ? ((await response.json()) as JsonValue) : await response.text();
      return this.extractItems(data);
    } finally {
      clearTimeout(timeout);
    }
  }

  private extractItems(data: JsonValue | string): unknown[] {
    if (Array.isArray(data)) {
      return data;
    }

    if (typeof data === "object" && data !== null) {
      const record = data as Record<string, unknown>;
      if (Array.isArray(record.items)) {
        return record.items;
      }
      if (Array.isArray(record.data)) {
        return record.data;
      }
      if (Array.isArray(record.results)) {
        return record.results;
      }
      return [record];
    }

    return [{ value: data }];
  }

  private async insertItem(userSourceId: string, fingerprint: string, raw: unknown, title?: string) {
    try {
      this.database.db
        .prepare(
          `INSERT INTO source_items (id, user_source_id, fingerprint, title, raw, seen_at)
           VALUES (?, ?, ?, ?, ?, ?)`
        )
        .run(this.database.id(), userSourceId, fingerprint, title ?? null, JSON.stringify(raw), this.database.now());
      return true;
    } catch (error) {
      if (typeof error === "object" && error !== null && "code" in error && error.code === "SQLITE_CONSTRAINT_UNIQUE") {
        return false;
      }
      throw error;
    }
  }

  private fingerprint(raw: unknown, path?: string | null) {
    const selected = path ? this.getPath(raw, path) : raw;
    const stable = typeof selected === "undefined" || selected === null ? raw : selected;
    return createHash("sha256").update(JSON.stringify(stable)).digest("hex");
  }

  private title(raw: unknown, path?: string | null) {
    const selected = path ? this.getPath(raw, path) : this.getPath(raw, "title") ?? this.getPath(raw, "name");
    return typeof selected === "string" ? selected : undefined;
  }

  private getPath(raw: unknown, path: string): unknown {
    return path.split(".").reduce<unknown>((current, key) => {
      if (typeof current !== "object" || current === null) {
        return undefined;
      }
      return (current as Record<string, unknown>)[key];
    }, raw);
  }

  private findUserSource(userSourceId: string) {
    return this.database.db
      .prepare(
        `SELECT
          us.*,
          s.url AS source_url,
          s.name AS source_name
        FROM user_sources us
        JOIN sources s ON s.id = us.source_id
        WHERE us.id = ?`
      )
      .get(userSourceId) as UserSourceFetchRow | undefined;
  }

  private createFetchRun(userSourceId: string) {
    const id = this.database.id();
    this.database.db
      .prepare("INSERT INTO fetch_runs (id, user_source_id, status, started_at) VALUES (?, ?, 'SUCCESS', ?)")
      .run(id, userSourceId, this.database.now());
    return id;
  }

  private updateFetchRun(id: string, status: "SUCCESS" | "FAILED", newItemCount: number, errorMessage?: string) {
    this.database.db
      .prepare(
        `UPDATE fetch_runs
         SET status = ?, new_item_count = ?, error_message = ?, finished_at = ?
         WHERE id = ?`
      )
      .run(status, newItemCount, errorMessage ?? null, this.database.now(), id);
  }
}

interface UserSourceFetchRow {
  id: string;
  user_id: string;
  source_id: string;
  label: string | null;
  is_active: number;
  notify_on_first_run: number;
  item_key_path: string | null;
  title_path: string | null;
  last_fetched_at: string | null;
  source_url: string;
  source_name: string | null;
}
