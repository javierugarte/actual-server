import { Injectable, NotFoundException } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { RegisterDeviceDto } from "./dto/register-device.dto";

@Injectable()
export class DevicesService {
  constructor(private readonly database: DatabaseService) {}

  async register(userId: string, dto: RegisterDeviceDto) {
    const now = this.database.now();
    const existing = this.database.db.prepare("SELECT id FROM devices WHERE token = ?").get(dto.token) as { id: string } | undefined;

    if (existing) {
      this.database.db
        .prepare(
          `UPDATE devices
           SET user_id = ?, app_version = ?, is_active = 1, last_seen_at = ?, updated_at = ?
           WHERE token = ?`
        )
        .run(userId, dto.appVersion ?? null, now, now, dto.token);
    } else {
      this.database.db
        .prepare(
          `INSERT INTO devices (id, user_id, token, app_version, last_seen_at, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .run(this.database.id(), userId, dto.token, dto.appVersion ?? null, now, now, now);
    }

    return this.findByToken(dto.token);
  }

  list(userId: string) {
    const rows = this.database.db
      .prepare("SELECT * FROM devices WHERE user_id = ? ORDER BY last_seen_at DESC")
      .all(userId) as DeviceRow[];
    return rows.map((row) => this.map(row));
  }

  async deactivate(userId: string, id: string) {
    const result = this.database.db
      .prepare("UPDATE devices SET is_active = 0, updated_at = ? WHERE id = ? AND user_id = ?")
      .run(this.database.now(), id, userId);

    if (result.changes === 0) {
      throw new NotFoundException("Device not found");
    }

    return { ok: true };
  }

  deactivateTokens(tokens: string[]) {
    if (tokens.length === 0) {
      return Promise.resolve({ count: 0 });
    }

    const update = this.database.db.prepare("UPDATE devices SET is_active = 0, updated_at = ? WHERE token = ?");
    const now = this.database.now();
    const count = this.database.db.transaction((values: string[]) => {
      let changes = 0;
      for (const token of values) {
        changes += update.run(now, token).changes;
      }
      return changes;
    })(tokens);

    return Promise.resolve({ count });
  }

  private findByToken(token: string) {
    const row = this.database.db.prepare("SELECT * FROM devices WHERE token = ?").get(token) as DeviceRow;
    return this.map(row);
  }

  private map(row: DeviceRow) {
    return {
      id: row.id,
      token: row.token,
      platform: row.platform,
      appVersion: row.app_version,
      isActive: Boolean(row.is_active),
      lastSeenAt: new Date(row.last_seen_at),
      createdAt: new Date(row.created_at)
    };
  }
}

interface DeviceRow {
  id: string;
  token: string;
  platform: string;
  app_version: string | null;
  is_active: number;
  last_seen_at: string;
  created_at: string;
}
