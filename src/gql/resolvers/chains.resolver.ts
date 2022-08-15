import { Args, Query, Resolver } from '@nestjs/graphql';
import { ChainService } from 'src/chain/chain.service';
import { Chain } from '../models/chain.model';

@Resolver(() => Chain)
export class ChainsResolver {
  constructor(private readonly chainSvc: ChainService) {}
  @Query(() => [Chain], {
    name: 'chains',
  })
  async queryChains(): Promise<Chain[]> {
    return await this.chainSvc.listChains();
  }

  @Query(() => Chain, {
    name: 'chain',
    nullable: true,
  })
  async queryChain(@Args('chain') chain: string): Promise<Chain> {
    return await this.chainSvc.getChainInfo(chain);
  }
}
