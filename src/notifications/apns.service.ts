import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as apn from "@parse/node-apn";
import { DevicesService } from "../devices/devices.service";

export interface PushMessage {
  userId: string;
  title: string;
  body: string;
  payload: Record<string, unknown>;
}

@Injectable()
export class ApnsService implements OnModuleDestroy {
  private readonly logger = new Logger(ApnsService.name);
  private provider?: apn.Provider;

  constructor(
    private readonly config: ConfigService,
    private readonly devices: DevicesService
  ) {}

  async sendToUser(message: PushMessage) {
    const activeDevices = await this.devicesList(message.userId);
    if (activeDevices.length === 0) {
      return { status: "SKIPPED" as const, sentCount: 0, failedCount: 0 };
    }

    if (this.config.get<string>("PUSH_DRY_RUN", "true") === "true") {
      this.logger.log(`Dry-run APNs notification for user ${message.userId}: ${message.title}`);
      return { status: "DRY_RUN" as const, sentCount: activeDevices.length, failedCount: 0 };
    }

    const provider = this.getProvider();
    const notification = new apn.Notification();
    notification.topic = this.config.getOrThrow<string>("APNS_TOPIC");
    notification.pushType = "alert";
    notification.alert = {
      title: message.title,
      body: message.body
    };
    notification.sound = "default";
    notification.payload = message.payload;

    const response = await provider.send(
      notification,
      activeDevices.map((device) => device.token)
    );

    const invalidTokens = response.failed
      .filter((failure) => ["BadDeviceToken", "Unregistered", "DeviceTokenNotForTopic"].includes(failure.response?.reason ?? ""))
      .map((failure) => failure.device);
    await this.devices.deactivateTokens(invalidTokens);

    return {
      status: response.failed.length > 0 ? ("FAILED" as const) : ("SENT" as const),
      sentCount: response.sent.length,
      failedCount: response.failed.length
    };
  }

  async onModuleDestroy() {
    await this.provider?.shutdown();
  }

  private async devicesList(userId: string) {
    const devices = await this.devices.list(userId);
    return devices.filter((device) => device.isActive);
  }

  private getProvider() {
    if (this.provider) {
      return this.provider;
    }

    const key = this.config.get<string>("APNS_KEY")?.replace(/\\n/g, "\n");
    const keyId = this.config.get<string>("APNS_KEY_ID");
    const teamId = this.config.get<string>("APNS_TEAM_ID");

    if (!key || !keyId || !teamId) {
      throw new Error("Missing APNs credentials. Set APNS_KEY, APNS_KEY_ID and APNS_TEAM_ID.");
    }

    this.provider = new apn.Provider({
      token: { key, keyId, teamId },
      production: this.config.get<string>("APNS_PRODUCTION", "false") === "true"
    });

    return this.provider;
  }
}
