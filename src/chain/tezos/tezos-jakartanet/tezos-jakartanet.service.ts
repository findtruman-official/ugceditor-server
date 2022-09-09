import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StoryService } from 'src/story/story.service';
import { verifySignature } from '@taquito/utils';
import { Key } from 'sotez';
import { ContractProvider, TezosToolkit } from '@taquito/taquito';

@Injectable()
export class TezosJakartanetService implements Chain.ChainIntegration {
  public chain = 'tezos-jakartanet';
  public name = 'Tezos(Jakartanet)';
  public taskModule: Chain.TaskModuleType = 'basic';
  public factoryAddress = '';
  public findsAddress = '';
  public enabled = true;

  private tezos: TezosToolkit;
  private factory: Awaited<ReturnType<ContractProvider['at']>>;

  constructor(
    private readonly _storySvc: StoryService,
    private readonly _configSvc: ConfigService,
  ) {}

  async onModuleInit() {
    this.enabled = this._configSvc.get('TEZOS_JAKARTANET_ENABLE') === 'true';
    if (!this.enabled) return;

    this.factoryAddress = this._configSvc.get(
      'TEZOS_JAKARTANET_FACTORY_ADDRESS',
    );
    this.findsAddress = this._configSvc.get('TEZOS_JAKARTANET_FINDS');
    const enableSync =
      this._configSvc.get('TEZOS_JAKARTANET_ENABLE_SYNC') === 'true';
    const endpoint = this._configSvc.get('TEZOS_JAKARTANET_ENDPOINT');

    this.tezos = new TezosToolkit(endpoint);
    this.factory = await this.tezos.contract.at(this.factoryAddress);

    if (enableSync) {
      // TODO start sync tasks
    }
  }

  async isPkAccountMatched(pubkey: string, account: string): Promise<boolean> {
    const key = new Key({ key: pubkey });
    await key.ready;
    return (await key.publicKeyHash()) === account;
  }

  async isValidSignature(
    params: Chain.IsValidSignatureParams,
  ): Promise<boolean> {
    console.log(params);
    return verifySignature(
      // messageBytes
      params.message,
      // publicKey
      params.account,
      // signature
      params.signature,
    );
  }

  async formatGeneralMetadatas(
    metadatas: Chain.GeneralMetadata[],
  ): Promise<Chain.MetadataJsonFile[]> {
    // TODO transform nft metatdata to tezos standard
    return [];
  }

  async getStory(chainStoryId: string): Promise<Chain.Story> {
    const storage = await this.factory.storage();
    const { cid, author } = await storage['storyMap'].get(
      parseInt(chainStoryId),
    );

    return {
      id: chainStoryId,
      cid,
      author,
      addr: this.factoryAddress,
    };
  }
  async getStoryNftSale(chainStoryId: string): Promise<Chain.NftSale> {
    const storage = await this.factory.storage();

    const {
      price,
      total,
      authorReserve,
      sold,
      authorClaimed,
      name,
      uriPrefix,
    } = await storage['storyNftMap'].get(parseInt(chainStoryId));

    return {
      saleAddr: this.factoryAddress,
      name,
      uriPrefix,
      type: '721',
      price: price.toString(),
      total: parseInt(total.toString()),
      authorClaimed: parseInt(authorClaimed.toString()),
      sold: parseInt(sold.toString()),
      authorReserved: parseInt(authorReserve.toString()),
    };
  }

  async getTask(
    chainStoryId: string,
    chainTaskId: string,
  ): Promise<Chain.Task> {
    return null;
  }

  async getSubmit(
    chainStoryId: string,
    chainTaskId: string,
    chainSubmitId: string,
  ): Promise<Chain.Submit> {
    return null;
  }
}
