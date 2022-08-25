import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { UserIdent } from '../middleware/user-ident';

@Injectable()
export class IdentGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const ident: UserIdent = request.res.locals.ident;
    return !!ident;
  }
}
