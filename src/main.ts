import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ALLOWED_ORIGINS } from './config/siteConfig';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS
  app.enableCors({
    origin: ALLOWED_ORIGINS,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });
  await app.listen(3000);
}
bootstrap();
