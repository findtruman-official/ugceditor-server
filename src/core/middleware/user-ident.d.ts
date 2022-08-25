import 'express';

type UserIdent = {
  chain: string;
  account: string;
};

interface Locals {
  ident?: UserIdent;
}

declare module 'express' {
  export interface Response {
    locals: Locals;
  }
  export interface Request {
    res: Response;
  }
}
