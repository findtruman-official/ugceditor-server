import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { UserIdent } from '../middleware/user-ident';

@Injectable()
export class IdentGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const type = context.getType<'http' | 'ws' | 'rpc' | 'graphql'>();
    switch (type) {
      case 'graphql': {
        const ctx = GqlExecutionContext.create(context);
        return !!ctx.getContext().req.res.locals.ident;
      }
      case 'http': {
        const request = context.switchToHttp().getRequest();
        const ident: UserIdent = request.res.locals.ident;
        return !!ident;
      }
      default: {
        throw new Error(`not support context: ${type}`);
      }
    }
  }
}
