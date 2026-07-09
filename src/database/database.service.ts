import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export type SqliteDatabase = Database.Database;

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  readonly db: SqliteDatabase;

  constructor(config: ConfigService) {
    const databasePath = resolveDatabasePath(config.get<string>("SQLITE_PATH", "./data/actual-server.db"));
    fs.mkdirSync(path.dirname(databasePath), { recursive: true });

    this.db = new Database(databasePath);
    this.db.pragma("foreign_keys = ON");
  }

  id() {
    return randomUUID();
  }

  now() {
    return new Date().toISOString();
  }

  bool(value: unknown) {
    return Boolean(value);
  }

  date(value: unknown) {
    return typeof value === "string" ? new Date(value) : null;
  }

  json<T>(value: unknown): T {
    return JSON.parse(String(value)) as T;
  }

  onModuleDestroy() {
    this.db.close();
  }
}

function resolveDatabasePath(databasePath: string) {
  if (path.isAbsolute(databasePath)) {
    return databasePath;
  }

  return path.resolve(process.cwd(), databasePath);
}
