import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsString } from "class-validator";

export class UpdateSourceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  itemKeyPath?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  titlePath?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  notifyOnFirstRun?: boolean;
}
