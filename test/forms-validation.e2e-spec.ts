import {
  Body,
  Controller,
  INestApplication,
  Post,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { CreateFormDto } from '../src/forms/dto/create-form.dto';

@Controller('v1/forms')
class TestFormsController {
  @Post()
  create(@Body() dto: CreateFormDto) {
    return dto;
  }
}

describe('Forms validation (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [TestFormsController],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects extra fields on POST /v1/forms', () => {
    return request(app.getHttpServer())
      .post('/v1/forms')
      .send({
        title: 'Candidate Intake',
        description: 'Collect candidate details',
        rogue: 'should be rejected',
      })
      .expect(400)
      .expect(({ body }) => {
        expect(body.message).toContain('property rogue should not exist');
      });
  });
});
