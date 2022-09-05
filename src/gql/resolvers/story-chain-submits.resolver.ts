import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { StoryChainTaskSubmit } from '../models/story-chain-submit.model';

@Resolver(() => StoryChainTaskSubmit)
export class StoryChainSubmitsResolver {
  @ResolveField('account', () => String)
  getAccount(@Parent() submit: StoryChainTaskSubmit) {
    return submit.creator;
  }
}
