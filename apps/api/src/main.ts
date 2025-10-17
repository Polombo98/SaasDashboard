import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.use(cookieParser());
  app.enableCors({ origin: ['http://localhost:3000'], credentials: true });

  const swagger = new DocumentBuilder()
    .setTitle('SaaS API')
    .setVersion('0.1')
    .addBearerAuth()
    .build();
  const doc = SwaggerModule.createDocument(app, swagger);
  SwaggerModule.setup('/docs', app, doc);

  const port = Number(config.get('PORT') || 3001);
  await app.listen(port);
}
bootstrap();
