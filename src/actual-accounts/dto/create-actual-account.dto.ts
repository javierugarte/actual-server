import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsUrl } from "class-validator";

export class CreateActualAccountDto {
  @ApiProperty({ example: "Cuenta corriente" })
  @IsString()
  name: string;

  @ApiProperty({ example: "https://actual.example.com/v1" })
  @IsUrl({ require_protocol: true })
  baseUrl: string;

  @ApiProperty()
  @IsString()
  apiKey: string;

  @ApiProperty({ description: "Actual Budget sync id" })
  @IsString()
  budgetSyncId: string;

  @ApiProperty({ description: "Actual account id" })
  @IsString()
  accountId: string;

  @ApiPropertyOptional({ description: "Only required for encrypted budgets on first interaction" })
  @IsOptional()
  @IsString()
  budgetEncryptionPassword?: string;
}
