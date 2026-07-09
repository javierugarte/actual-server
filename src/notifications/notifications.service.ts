import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { ApnsService } from "./apns.service";

@Injectable()
export class NotificationsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly apns: ApnsService
  ) {}

  async notifyNewItems(params: {
    userId: string;
    userSourceId: string;
    sourceLabel: string;
    newItemCount: number;
    itemTitles: string[];
  }) {
    const title = params.sourceLabel;
    const body =
      params.newItemCount === 1
        ? params.itemTitles[0] ?? "Hay una novedad"
        : `${params.newItemCount} novedades disponibles`;
    const payload = {
      type: "source_update",
      userSourceId: params.userSourceId,
      newItemCount: params.newItemCount
    };

    const result = await this.apns.sendToUser({
      userId: params.userId,
      title,
      body,
      payload
    });

    const id = this.database.id();
    const createdAt = this.database.now();
    this.database.db
      .prepare(
        `INSERT INTO notifications (
          id, user_source_id, user_id, status, title, body, payload, sent_count, failed_count, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        params.userSourceId,
        params.userId,
        result.status,
        title,
        body,
        JSON.stringify(payload),
        result.sentCount,
        result.failedCount,
        createdAt
      );

    return {
      id,
      userSourceId: params.userSourceId,
      userId: params.userId,
      status: result.status,
      title,
      body,
      payload,
      sentCount: result.sentCount,
      failedCount: result.failedCount,
      createdAt: new Date(createdAt)
    };
  }
}
