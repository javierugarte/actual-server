import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MinLength } from "class-validator";

export class RegisterDeviceDto {
  @ApiProperty({ description: "Hex-encoded APNs device token delivered by iOS" })
  @IsString()
  @MinLength(32)
  token: string;

  @ApiPropertyOptional({ example: "1.0.0" })
  @IsOptional()
  @IsString()
  appVersion?: string;
}
