import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { json, urlencoded } from 'express';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { GraphqlExceptionFilter } from './common/filters/graphql-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 쿠키 파서
  app.use(cookieParser());

  // Body parser 크기 제한 증가 (대용량 GraphQL 요청 처리)
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));
  const logger = new Logger('Bootstrap');

  // CORS 설정
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://job-clover.vercel.app',
    ],
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
