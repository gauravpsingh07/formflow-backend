import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateFormDto } from './dto/create-form.dto';
import { UpdateFormDto } from './dto/update-form.dto';
import { FormsService } from './forms.service';

@Controller('v1/forms')
@UseGuards(JwtAuthGuard)
export class FormsController {
  constructor(private readonly formsService: FormsService) {}

  @Post()
  create(@Req() req: any, @Body() dto: CreateFormDto) {
    return this.formsService.create(req.user.sub, dto);
  }

  @Get()
  list(@Req() req: any) {
    return this.formsService.list(req.user.sub);
  }

  @Get(':id')
  getOne(@Param('id') id: string, @Req() req: any) {
    return this.formsService.getOne(req.user.sub, id);
  }

  @Patch(':id')
  updateOne(@Param('id') id: string, @Req() req: any, @Body() dto: UpdateFormDto) {
    return this.formsService.updateOne(req.user.sub, id, dto);
  }

  @Delete(':id')
  deleteOne(@Param('id') id: string, @Req() req: any) {
    return this.formsService.deleteOne(req.user.sub, id);
  }

  @Post(':id/publish')
  publish(@Param('id') id: string, @Req() req: any) {
    return this.formsService.publish(req.user.sub, id);
  }

  @Post(':id/unpublish')
  unpublish(@Param('id') id: string, @Req() req: any) {
    return this.formsService.unpublish(req.user.sub, id);
  }
}
