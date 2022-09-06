import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { NftSale } from '../models/nft-sale.model';
// import { ChainService } from 'src/chain/chain.service';
import { IpfsService } from 'src/ipfs/ipfs.service';
import { Logger } from '@nestjs/common';
// import { StoryService, StorySort } from 'src/story/story.service';
@Resolver(() => NftSale)
export class NftSalesResolver {
  private readonly _logger = new Logger(NftSalesResolver.name);

  constructor(
    // private readonly _chainSvc: ChainService,
    // private readonly _storySvc: StoryService,
    private readonly _ipfsSvc: IpfsService,
  ) {}
  @ResolveField('image', () => String)
  async getImage(@Parent() sale: NftSale): Promise<string> {
    try {
      let uriPrefix = sale.uriPrefix;

      // dirty data on dev network
      uriPrefix = uriPrefix.replace('undefined', '');
      uriPrefix = uriPrefix.replace(
        'https://findtruman.io/fcc-story/ipfs/json/',
        '',
      );
      //

      const ipfsCid = uriPrefix.replace('ipfs://', '') + '/' + '1.json';

      const dat = await this._ipfsSvc.loadJson(ipfsCid, { timeout: 5000 });
      return dat.image;
    } catch (err) {
      this._logger.error('get nft-sale cid content failed', err);
      return '';
    }
  }
}
