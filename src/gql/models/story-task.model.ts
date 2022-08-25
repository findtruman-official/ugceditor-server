import { Field, Int, ObjectType } from '@nestjs/graphql';
import { StoryTaskStatus } from '../enum/story-task-status.enum';

@ObjectType()
export class StoryTask {
  @Field(() => Int)
  id: number;

  @Field()
  chain: string;

  @Field()
  chainStoryId: string;

  @Field()
  title: string;

  @Field()
  description: string;

  @Field(() => StoryTaskStatus)
  status: StoryTaskStatus;
}
