import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class StoryChapter {
  @Field(() => Int)
  id: number;

  @Field()
  name: string;

  @Field()
  content: string;

  @Field()
  createAt: Date;

  @Field()
  updateAt: Date;
}
