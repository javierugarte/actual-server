import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import type { StringValue } from "ms";
import { DatabaseService } from "../database/database.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  display_name: string | null;
  is_admin: number;
  created_at: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly database: DatabaseService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase();
    const existing = this.database.db.prepare("SELECT id FROM users WHERE email = ?").get(email);
    if (existing) {
      throw new ConflictException("Email already registered");
    }

    const usersCount = this.database.db.prepare("SELECT COUNT(*) AS count FROM users").get() as { count: number };
    const now = this.database.now();
    const row: UserRow = {
      id: this.database.id(),
      email,
      password_hash: await bcrypt.hash(dto.password, 12),
      display_name: dto.displayName ?? null,
      is_admin: usersCount.count === 0 ? 1 : 0,
      created_at: now
    };

    this.database.db
      .prepare(
        `INSERT INTO users (id, email, password_hash, display_name, is_admin, created_at, updated_at)
         VALUES (@id, @email, @password_hash, @display_name, @is_admin, @created_at, @created_at)`
      )
      .run(row);

    const user = this.mapPublicUser(row);

    return {
      user,
      accessToken: await this.sign(user)
    };
  }

  async login(dto: LoginDto) {
    const user = this.database.db.prepare("SELECT * FROM users WHERE email = ?").get(dto.email.toLowerCase()) as UserRow | undefined;
    if (!user || !(await bcrypt.compare(dto.password, user.password_hash))) {
      throw new UnauthorizedException("Invalid credentials");
    }

    return {
      user: this.mapPublicUser(user),
      accessToken: await this.sign({ id: user.id, email: user.email, isAdmin: Boolean(user.is_admin) })
    };
  }

  private sign(user: { id: string; email: string; isAdmin: boolean }) {
    return this.jwt.signAsync(
      { sub: user.id, email: user.email, isAdmin: user.isAdmin },
      { expiresIn: this.config.get<string>("JWT_EXPIRES_IN", "15m") as StringValue }
    );
  }

  private mapPublicUser(user: UserRow) {
    return {
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      isAdmin: Boolean(user.is_admin),
      createdAt: new Date(user.created_at)
    };
  }
}
