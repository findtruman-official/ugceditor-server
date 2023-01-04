import type { ActorMethod } from '@dfinity/agent';

export interface StoryNftService {
  nameDip721: ActorMethod<[], string>;
  balanceOfDip721: ActorMethod<[string], bigint>;
}

export const idlFactory = ({ IDL }) => {
  return IDL.Service({
    nameDip721: IDL.Func([], [IDL.Text], ['query']),
    balanceOfDip721: IDL.Func([IDL.Principal], [IDL.Nat64], ['query']),
  });
};
