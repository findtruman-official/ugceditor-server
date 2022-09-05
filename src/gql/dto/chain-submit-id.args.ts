import { ArgsType, Field } from '@nestjs/graphql';
import { ChainTaskIdArgs } from './chain-task-id.args';

@ArgsType()
export class ChainSubmitIdArgs extends ChainTaskIdArgs {
  @Field()
  submitId: string;
}
