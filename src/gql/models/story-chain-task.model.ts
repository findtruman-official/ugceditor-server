import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';

export enum StoryChainTaskStatus {
  Todo,
  Done,
  Cancelled,
}
registerEnumType(StoryChainTaskStatus, {
  name: 'StoryChainTaskStatus',
});

@ObjectType()
export class StoryChainTask {
  @Field()
  chain: string;
  @Field()
  chainStoryId: string;
  @Field()
  chainTaskId: string;
  @Field()
  creator: string;
  @Field()
  cid: string;
  @Field()
  nft: string;
  @Field(() => [String])
  rewardNfts: string[];
  @Field(() => StoryChainTaskStatus)
  status: StoryChainTaskStatus;
  @Field()
  title: string;
  @Field()
  description: string;
  @Field()
  createTime: Date;
  @Field()
  updateTime: Date;
}
