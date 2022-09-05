import { ArgsType, Field } from '@nestjs/graphql';
import { StoryIdArgs } from './story-id.args';

@ArgsType()
export class ChainTaskIdArgs extends StoryIdArgs {
  @Field()
  chainTaskId: string;
}
