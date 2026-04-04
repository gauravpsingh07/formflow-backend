import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { FormsModule } from './forms/forms.module';
import { PublicModule } from './public/public.module';
import { WebhooksModule } from './webhooks/webhooks.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    FormsModule,
    PublicModule,
    WebhooksModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
