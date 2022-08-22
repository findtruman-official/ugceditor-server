import { Plugin } from '@nestjs/apollo';
import { Logger } from '@nestjs/common';
import {
  ApolloServerPlugin,
  GraphQLRequestListener,
} from 'apollo-server-plugin-base';

@Plugin()
export class LoggingPlugin implements ApolloServerPlugin {
  private logger = new Logger(LoggingPlugin.name);
  async requestDidStart(): Promise<GraphQLRequestListener> {
    return {
      didResolveOperation: async (ctx) => {
        this.logger.debug(`${ctx.operation.operation}`);
        for (const sel of ctx.operation.selectionSet.selections) {
          const method = (sel as any).name.value;
          const args = (sel as any).arguments
            .filter((arg) => arg.value.value !== undefined)
            .map(
              (arg) => `${arg.name.value}: ${JSON.stringify(arg.value.value)}`,
            );
          this.logger.debug(`  ${method}(${args})`);
        }
      },
    };
  }
}
