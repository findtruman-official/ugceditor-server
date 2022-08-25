import { ArgsType, Field } from '@nestjs/graphql';

@ArgsType()
export class StoryIdArgs {
  @Field()
  chain: string;

  @Field()
  chainStoryId: string;
}
