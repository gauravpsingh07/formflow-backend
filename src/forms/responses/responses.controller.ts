import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ResponsesService } from './responses.service';

// Change this import to whatever your project uses:
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@Controller('v1/forms/:formId/responses')
@UseGuards(JwtAuthGuard)
export class ResponsesController {
  constructor(private readonly responses: ResponsesService) {}

  @Get()
  async list(
    @Param('formId') formId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('query') query = '',
    @Req() req: any,
  ) {
    const userId = req.user.sub;

    return this.responses.listResponses({
      formId,
      userId,
      page: Number(page),
      limit: Number(limit),
      query,
    });
  }

  @Get(':responseId')
  async detail(@Param('formId') formId: string, @Param('responseId') responseId: string, @Req() req: any) {
    const userId = req.user.sub;

    return this.responses.getResponseDetail({ formId, responseId, userId });
  }
}
