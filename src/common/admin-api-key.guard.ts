import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class AdminApiKeyGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const expected = this.config.get<string>("ADMIN_API_KEY");
    const received = request.headers["x-admin-api-key"];

    if (!expected || received !== expected) {
      throw new UnauthorizedException("Invalid admin API key");
    }

    return true;
  }
}
