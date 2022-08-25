import { Field, Int, ObjectType } from '@nestjs/graphql';
import { StoryTaskSubmitStatus } from '../enum/story-task-submit-status.enum';

@ObjectType()
export class StoryTaskSubmit {
  @Field(() => Int)
  id: number;

  @Field(() => Int)
  taskId: number;

  @Field()
  account: string;

  @Field()
  content: string;

  @Field(() => StoryTaskSubmitStatus)
  status: StoryTaskSubmitStatus;

  @Field()
  createTime: Date;
}
