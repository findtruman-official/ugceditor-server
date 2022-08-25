import { ArgsType, Field, Int } from '@nestjs/graphql';

@ArgsType()
export class UpdateStoryTaskArgs {
  @Field(() => Int)
  id: number;

  @Field({ nullable: true })
  title: string;

  @Field({ nullable: true })
  description: string;
}
