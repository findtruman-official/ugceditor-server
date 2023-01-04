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
export interface DefTask {
  id: bigint;
  cid: string;
  nft: Principal;
  status: bigint;
  creator: Principal;
  rewardNfts: Array<bigint>;
  nextSubmitId: bigint;
}
export interface DefTaskSubmit {
  id: bigint;
  cid: string;
  status: bigint;
  creator: Principal;
}
export interface DefStoryTaskInfo {
  nextTaskId: bigint;
  storyId: bigint;
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
  cancelTask: ActorMethod<[bigint, bigint], undefined>;
  claimAuthorReservedNft: ActorMethod<[bigint, bigint], [] | [Array<bigint>]>;
  createTask: ActorMethod<
    [bigint, string, Principal, Array<bigint>],
    [] | [DefTask]
  >;
  createTaskSubmit: ActorMethod<[bigint, bigint, string], DefTaskSubmit>;
  getTask: ActorMethod<[bigint, bigint], [] | [DefTask]>;
  getTaskSubmit: ActorMethod<[bigint, bigint, bigint], [] | [DefTaskSubmit]>;
  markTaskDone: ActorMethod<[bigint, bigint, bigint], undefined>;
  updateTask: ActorMethod<[bigint, bigint, string], [] | [DefTask]>;
  withdrawTaskSubmit: ActorMethod<[bigint, bigint, bigint], undefined>;
  getStoryTaskInfo: ActorMethod<[bigint], [] | [DefStoryTaskInfo]>;
}

export const idlFactory = ({ IDL }) => {
  const Task = IDL.Record({
    id: IDL.Nat,
    cid: IDL.Text,
    nft: IDL.Principal,
    status: IDL.Nat,
    creator: IDL.Principal,
    rewardNfts: IDL.Vec(IDL.Nat64),
    nextSubmitId: IDL.Nat,
  });
  const TaskSubmit = IDL.Record({
    id: IDL.Nat,
    cid: IDL.Text,
    status: IDL.Nat,
    creator: IDL.Principal,
  });
  const Sale = IDL.Record({
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
  const Story = IDL.Record({
    id: IDL.Nat,
    cid: IDL.Text,
    author: IDL.Principal,
  });
  const StoryTaskInfo = IDL.Record({
    nextTaskId: IDL.Nat,
    storyId: IDL.Nat,
  });
  return IDL.Service({
    cancelTask: IDL.Func([IDL.Nat, IDL.Nat], [], ['oneway']),
    claimAuthorReservedNft: IDL.Func(
      [IDL.Nat, IDL.Nat],
      [IDL.Opt(IDL.Vec(IDL.Nat64))],
      [],
    ),
    countSales: IDL.Func([], [IDL.Nat], ['query']),
    countStories: IDL.Func([], [IDL.Nat], ['query']),
    createTask: IDL.Func(
      [IDL.Nat, IDL.Text, IDL.Principal, IDL.Vec(IDL.Nat64)],
      [IDL.Opt(Task)],
      [],
    ),
    createTaskSubmit: IDL.Func([IDL.Nat, IDL.Nat, IDL.Text], [TaskSubmit], []),
    getSale: IDL.Func([IDL.Nat], [IDL.Opt(Sale)], ['query']),
    getStory: IDL.Func([IDL.Nat], [IDL.Opt(Story)], ['query']),
    getTask: IDL.Func([IDL.Nat, IDL.Nat], [IDL.Opt(Task)], ['query']),
    getTaskSubmit: IDL.Func(
      [IDL.Nat, IDL.Nat, IDL.Nat],
      [IDL.Opt(TaskSubmit)],
      ['query'],
    ),
    markTaskDone: IDL.Func([IDL.Nat, IDL.Nat, IDL.Nat], [], ['oneway']),
    mintNft: IDL.Func([IDL.Nat], [IDL.Opt(IDL.Nat64)], []),
    publishNft: IDL.Func(
      [
        IDL.Nat,
        IDL.Nat,
        IDL.Nat,
        IDL.Principal,
        IDL.Principal,
        IDL.Nat,
        IDL.Text,
        IDL.Text,
        IDL.Text,
      ],
      [IDL.Opt(Sale)],
      [],
    ),
    publishStory: IDL.Func([IDL.Text], [Story], []),
    updateStory: IDL.Func([IDL.Nat, IDL.Text], [IDL.Opt(Story)], []),
    updateTask: IDL.Func([IDL.Nat, IDL.Nat, IDL.Text], [IDL.Opt(Task)], []),
    withdrawTaskSubmit: IDL.Func([IDL.Nat, IDL.Nat, IDL.Nat], [], ['oneway']),
    getStoryTaskInfo: IDL.Func([IDL.Nat], [IDL.Opt(StoryTaskInfo)], ['query']),
  }) as Def_SERVICE;
};
export const init = ({ IDL }) => {
  return [];
};
