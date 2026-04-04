import { IsArray, IsBoolean, IsIn, IsOptional, IsString, IsUrl, Length } from 'class-validator';
import { WEBHOOK_EVENT_NAMES } from './create-webhook.dto';

export class UpdateWebhookDto {
  @IsOptional()
  @IsUrl({
    require_protocol: true,
  })
  url?: string;

  @IsOptional()
  @IsString()
  @Length(8, 255)
  secret?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsArray()
  @IsIn(WEBHOOK_EVENT_NAMES, { each: true })
  events?: Array<(typeof WEBHOOK_EVENT_NAMES)[number]>;
}
