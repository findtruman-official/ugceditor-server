import { ArgsType, Field, Int } from '@nestjs/graphql';

@ArgsType()
export class CreateTaskSubmitArgs {
  @Field(() => Int)
  taskId: number;
  @Field()
  content: string;
}
