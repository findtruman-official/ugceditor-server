import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';

export enum StoryChainTaskSubmitStatus {
  Pending,
  Approved,
  Rejected,
  Withdrawed,
}

registerEnumType(StoryChainTaskSubmitStatus, {
  name: 'StoryChainTaskSubmitStatus',
});

@ObjectType()
export class StoryChainTaskSubmit {
  @Field()
  chain: string;

  @Field()
  chainStoryId: string;

  @Field()
  chainTaskId: string;

  @Field()
  chainSubmitId: string;

  @Field()
  creator: string;

  @Field()
  cid: string;

  @Field(() => StoryChainTaskSubmitStatus)
  status: StoryChainTaskSubmitStatus;

  @Field()
  content: string;

  @Field()
  createTime: Date;

  @Field()
  updateTime: Date;
}
