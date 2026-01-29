import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { GraphqlExceptionFilter } from './common/filters/graphql-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  // CORS 설정
  app.enableCors({
    origin: ['http://localhost:3000', 'https://job-clover.vercel.app'],
    credentials: true,
  });

  // 전역 검증 파이프
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // 전역 예외 필터
  app.useGlobalFilters(new GraphqlExceptionFilter());

  const port = process.env.PORT || 4000;
  await app.listen(port);
  logger.log(`Server running on http://localhost:${port}/graphql`);
}
void bootstrap();
