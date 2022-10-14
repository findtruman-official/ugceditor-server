import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';

export interface DefSale {
  id: bigint;
  nft: Principal;
  token: Principal;
  total: bigint;
  authorClaimed: bigint;
  authorReserved: bigint;
  recv: Principal;
  sold: bigint;
  price: bigint;
  uriPrefix: string;
}
export interface DefStory {
  id: bigint;
  cid: string;
  author: Principal;
}
export interface Def_SERVICE {
  countSales: ActorMethod<[], bigint>;
  countStories: ActorMethod<[], bigint>;
  getSale: ActorMethod<[bigint], [] | [DefSale]>;
  getStory: ActorMethod<[bigint], [] | [DefStory]>;
  mintNft: ActorMethod<[bigint], [] | [bigint]>;
  publishNft: ActorMethod<
    [bigint, bigint, bigint, Principal, Principal, bigint],
    [] | [DefSale]
  >;
  publishStory: ActorMethod<[string], DefStory>;
  updateStory: ActorMethod<[bigint, string], [] | [DefStory]>;
}

export const idlFactory = ({ IDL }) => {
  const Sale: DefSale = IDL.Record({
    id: IDL.Nat,
    nft: IDL.Principal,
    token: IDL.Principal,
    total: IDL.Nat,
    authorClaimed: IDL.Nat,
    authorReserved: IDL.Nat,
    recv: IDL.Principal,
    sold: IDL.Nat,
    price: IDL.Nat,
    uriPrefix: IDL.Text,
  });
  const Story: DefStory = IDL.Record({
    id: IDL.Nat,
    cid: IDL.Text,
    author: IDL.Principal,
  });
  return IDL.Service({
    countSales: IDL.Func([], [IDL.Nat], ['query']),
    countStories: IDL.Func([], [IDL.Nat], ['query']),
    getSale: IDL.Func([IDL.Nat], [IDL.Opt(Sale)], ['query']),
    getStory: IDL.Func([IDL.Nat], [IDL.Opt(Story)], ['query']),
    mintNft: IDL.Func([IDL.Nat], [IDL.Opt(IDL.Nat64)], []),
    publishNft: IDL.Func(
      [IDL.Nat, IDL.Nat, IDL.Nat, IDL.Principal, IDL.Principal, IDL.Nat],
      [IDL.Opt(Sale)],
      [],
    ),
    publishStory: IDL.Func([IDL.Text], [Story], []),
    updateStory: IDL.Func([IDL.Nat, IDL.Text], [IDL.Opt(Story)], []),
  }) as Def_SERVICE;
};
export const init = ({ IDL }) => {
  return [];
};
