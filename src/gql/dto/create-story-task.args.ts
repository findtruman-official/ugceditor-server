import { ArgsType, Field } from '@nestjs/graphql';

@ArgsType()
export class CreateStoryTaskArgs {
  @Field()
  chain: string;

  @Field()
  chainStoryId: string;

  @Field()
  title: string;

  @Field()
  description: string;
}
