import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StoryService } from 'src/story/story.service';

@Injectable()
export class TezosGhostTestnetService implements ChainIntegration {
  public chain = 'tezos-ghost-testnet';
  public name = 'Tezos(Ghostnet Testnet)';
  public taskModule: TaskModuleType = 'basic';
  public factoryAddress = ''; // TODO fill it.
  public findsAddress = ''; // TODO fill it.
  public enabled = true;

  constructor(
    private readonly _storySvc: StoryService,
    private readonly _configSvc: ConfigService,
  ) {}

  async onModuleInit() {
    // TODO setup tezos contract data sync
  }

  async isValidSignature(params: IsValidSignatureParams): Promise<boolean> {
    // TODO provide tezos signature verify feature
    return false;
  }

  async formatGeneralMetadatas(
    metadatas: GeneralMetadata[],
  ): Promise<MetadataJsonFile[]> {
    // TODO transform nft metatdata to tezos standard
    return [];
  }

  async getStory(chainStoryId: string): Promise<Story> {
    // TODO
    return null;
  }
  async getStoryNftSale(chainStoryId: string): Promise<NftSale> {
    // TODO
    return null;
  }
}
