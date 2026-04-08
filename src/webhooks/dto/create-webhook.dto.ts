import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
  Length,
} from 'class-validator';

export const WEBHOOK_EVENT_NAMES = [
  'response.created',
  'form.published',
  'form.unpublished',
] as const;

export class CreateWebhookDto {
  @IsUrl({
    require_protocol: true,
  })
  url!: string;

  @IsString()
  @Length(8, 255)
  secret!: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsArray()
  @IsIn(WEBHOOK_EVENT_NAMES, { each: true })
  events!: Array<(typeof WEBHOOK_EVENT_NAMES)[number]>;
}
