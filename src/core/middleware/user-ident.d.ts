import 'express';

interface Locals {
  ident?: {
    chainType: string;
    account: string;
  };
}

declare module 'express' {
  export interface Response {
    locals: Locals;
  }
  export interface Request {
    res: Response;
  }
}
