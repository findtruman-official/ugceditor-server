import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { IdentService } from '../ident/ident.service';

@Injectable()
export class UserIdentMiddleware implements NestMiddleware {
  constructor(private readonly identSvc: IdentService) {}
  async use(req: Request, res: Response, next: NextFunction) {
    const xToken = req.header('x-token');

    if (xToken) {
      try {
        const payload = await this.identSvc.decodeToken(xToken);

        res.locals.ident = payload;
      } catch (e) {
        // pass
      }
    }

    next();
  }
}
