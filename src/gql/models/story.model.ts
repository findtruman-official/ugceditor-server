import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class Story {
  @Field()
  chain: string;
  @Field()
  chainStoryId: string;

  @Field()
  onChainAddr: string;

  @Field()
  author: string;

  @Field()
  contentHash: string;

  @Field()
  createTime: Date;
  @Field()
  updateTime: Date;
}
