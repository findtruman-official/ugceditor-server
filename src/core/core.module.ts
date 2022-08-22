import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { BullModule } from '@nestjs/bull';
import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ComplexityPlugin } from './gql-plugins/complexity.plugin';
import { LoggingPlugin } from './gql-plugins/logger.plugin';
import { IdentModule } from './ident/ident.module';
import { RequestLoggerMiddleware } from './middleware/request-logger.middleware';
import { UserIdentMiddleware } from './middleware/user-ident.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: ['.env'],
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return {
          type: 'mysql',
          host: configService.get('DB_HOST'),
          port: configService.get<number>('DB_PORT', { infer: true }),
          username: configService.get('DB_USERNAME'),
          password: configService.get('DB_PASSWORD'),
          database: configService.get('DB_DATABASE'),
          autoLoadEntities: true,
          synchronize: configService.get<boolean>('DB_SYNC', { infer: true }),
        };
      },
    }),

    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        return {
          redis: {
            host: config.get('BULL_REDIS_HOST'),
            port: +config.get('BULL_REDIS_PORT'),
          },
          prefix: config.get('BULL_QUEUE_PREFIX'),
        };
      },
    }),

    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const debug = configService.get('GQL_DEBUG') === 'true';
        const playground = configService.get('GQL_PLAYGROUND') === 'true';
        return {
          debug,
          playground,
          autoSchemaFile: true,
        };
      },
    }),

    IdentModule,
  ],
  providers: [ComplexityPlugin, LoggingPlugin],
})
export class CoreModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestLoggerMiddleware, UserIdentMiddleware)
      .exclude(
        {
          path: '/ipfs/file/:cid',
          method: RequestMethod.GET,
        },
        {
          path: '/ipfs/json/:cid',
          method: RequestMethod.GET,
        },
      )
      .forRoutes('*');
  }
}
