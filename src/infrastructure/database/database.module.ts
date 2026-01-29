import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isDev = config.get('NODE_ENV') === 'development';

        return {
          type: 'better-sqlite3',
          database: config.get('DATABASE_URL') || 'local.sqlite',
          entities: [__dirname + '/../../domains/**/*.entity{.ts,.js}'],
          synchronize: isDev,
          migrationsRun: !isDev,
          migrations: [__dirname + '/migrations/*{.ts,.js}'],
          logging: isDev ? ['error'] : ['error'],
        };
      },
    }),
  ],
})
export class DatabaseModule {}
