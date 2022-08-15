import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class StoryInfo {
  @Field(() => Int)
  id: number;

  @Field()
  chain: string;

  @Field()
  chainStoryId: string;

  @Field()
  contentHash: string;

  @Field()
  title: string;
  @Field()
  cover: string;
  @Field()
  description: string;

  @Field()
  createAt: Date;

  @Field()
  updateAt: Date;
}
