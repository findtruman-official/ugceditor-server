import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { NftSale } from '../models/nft-sale.model';
// import { ChainService } from 'src/chain/chain.service';
import { IpfsService } from 'src/ipfs/ipfs.service';
// import { StoryService, StorySort } from 'src/story/story.service';
@Resolver(() => NftSale)
export class NftSalesResolver {
  constructor(
    // private readonly _chainSvc: ChainService,
    // private readonly _storySvc: StoryService,
    private readonly _ipfsSvc: IpfsService,
  ) {}
  @ResolveField('image', () => String)
  async getImage(@Parent() sale: NftSale): Promise<string> {
    let uriPrefix = sale.uriPrefix;

    // dirty data on dev network
    uriPrefix = uriPrefix.replace('undefined', '');
    uriPrefix = uriPrefix.replace(
      'https://findtruman.io/fcc-story/ipfs/json/',
      '',
    );
    //

    const ipfsCid = uriPrefix.replace('ipfs://', '') + '/' + '1.json';
    const dat = await this._ipfsSvc.loadJson(ipfsCid);
    return dat.image;
  }
}
