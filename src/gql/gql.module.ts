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
@Module({
  imports: [ChainModule, StoryModule, LoginModule, IpfsModule],
  providers: [
    ChainsResolver,
    StoriesResolver,
    JwtsResolver,
    UsersResolver,
    StoryInfosResolver,
    StoryChaptersResolver,
    NftSalesResolver,
  ],
})
export class GqlModule {}
