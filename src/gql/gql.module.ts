import { Module } from '@nestjs/common';
import { ChainModule } from 'src/chain/chain.module';
import { IpfsModule } from 'src/ipfs/ipfs.module';
import { LoginModule } from 'src/login/login.module';
import { StoryModule } from 'src/story/story.module';
import { ChainsResolver } from './resolvers/chains.resolver';
import { JwtsResolver } from './resolvers/jwts.resolver';
import { StoriesResolver } from './resolvers/stories.resolver';
import { StoryInfosResolver } from './resolvers/story-infos.resolver';
import { UsersResolver } from './resolvers/user.resolver';
import { StoryChaptersResolver } from './resolvers/story-chapters.resolver';
import { NftSalesResolver } from './resolvers/nft-sale.resolver';
import { StoryTasksResolver } from './resolvers/story-tasks.resolver';
import { StoryTaskSubmitsResolver } from './resolvers/story-task-submits.resolver';
import { StoryTaskModule } from 'src/story-task/story-task.module';
import { StoryChainTasksResolver } from './resolvers/story-chain-tasks.resolver';
import { StoryChainTaskModule } from 'src/story-chain-task/story-chain-task.module';
import { StoryChainSubmitsResolver } from './resolvers/story-chain-submits.resolver';
@Module({
  imports: [
    ChainModule,
    StoryModule,
    LoginModule,
    IpfsModule,
    StoryTaskModule,
    StoryChainTaskModule,
  ],
  providers: [
    ChainsResolver,
    StoriesResolver,
    JwtsResolver,
    UsersResolver,
    StoryInfosResolver,
    StoryChaptersResolver,
    NftSalesResolver,
    StoryTasksResolver,
    StoryTaskSubmitsResolver,
    StoryChainTasksResolver,
    StoryChainSubmitsResolver,
  ],
})
export class GqlModule {}
