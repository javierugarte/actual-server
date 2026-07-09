import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsString, IsUrl } from "class-validator";

export class CreateSourceDto {
  @ApiProperty({ example: "https://example.com/feed.json" })
  @IsUrl({ require_protocol: true })
  url: string;

  @ApiPropertyOptional({ example: "Example feed" })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional({ description: "Dot path used as stable item id, for example id or data.id" })
  @IsOptional()
  @IsString()
  itemKeyPath?: string;

  @ApiPropertyOptional({ description: "Dot path used as notification item title, for example title or name" })
  @IsOptional()
  @IsString()
  titlePath?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  notifyOnFirstRun?: boolean;
}
