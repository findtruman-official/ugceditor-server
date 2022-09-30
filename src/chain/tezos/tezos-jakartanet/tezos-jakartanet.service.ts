import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StoryService } from 'src/story/story.service';
import { verifySignature } from '@taquito/utils';
import { Key } from 'sotez';
import { ContractProvider, TezosToolkit } from '@taquito/taquito';
import { NftType } from 'src/story/entities/nft-sale.entity';
import { StoryChainTaskService } from 'src/story-chain-task/story-chain-task.service';
import { chain2ett_SubmitStatus, chain2ett_TaskStatus } from '../../utils';
import { StoryChainTaskStatus } from '../../../story-chain-task/entities/story-chain-task.entity';
import { StoryChainTaskSubmitStatus } from '../../../story-chain-task/entities/story-chain-task-submit.entity';

@Injectable()
export class TezosJakartanetService implements Chain.ChainIntegration {
  public chain = 'tezos-jakartanet';
  public name = 'Tezos(Jakartanet)';
  public taskModule: Chain.TaskModuleType = 'chain';
  public factoryAddress = '';
  public findsAddress = '';
  public enabled = true;

  private tezos: TezosToolkit;
  private factory: Awaited<ReturnType<ContractProvider['at']>>;
  private logger = new Logger(TezosJakartanetService.name);

  constructor(
    private readonly _storySvc: StoryService,
    private readonly _configSvc: ConfigService,
    private readonly _storyTaskSvc: StoryChainTaskService,
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
      this.syncChainData().catch((err) => {
        this.logger.error(`sync chain data failed`, err);
      });
      this.syncChainTaskData().catch((err) => {
        this.logger.error(`sync chain task data failed`, err);
      });
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
    return verifySignature(
      // messageBytes
      Buffer.from(params.message).toString('hex'),
      // publicKey
      params.account,
      // signature
      params.signature,
    );
  }

  async formatGeneralMetadatas(
    metadatas: Chain.GeneralMetadata[],
  ): Promise<Chain.MetadataJsonFile[]> {
    return metadatas.map((md) => ({
      item: md,
      json: {
        name: unescape(md.name),
        symbol: 'Story',
        description: unescape(md.description),
        image: md.image,
        artifactUri: md.image,
        displayUri: md.image,
        decimals: 0,
        isBooleanAmount: true,
        interfaces: ["TZIP-007-2021-04-17", "TZIP-016-2021-04-17", "TZIP-21"],
      },
    }));
  }

  async getStory(chainStoryId: string): Promise<Chain.Story> {
    const storage = await this.factory.storage();
    const data = await storage['storyMap'].get(parseInt(chainStoryId));
    if (!data) return null;
    const { cid, author } = data;
    return {
      id: chainStoryId,
      cid,
      author,
      addr: this.factoryAddress,
    };
  }

  async getStoryNftSale(chainStoryId: string): Promise<Chain.NftSale> {
    const storage = await this.factory.storage();

    const data = await storage['storyNftMap'].get(parseInt(chainStoryId));
    if (!data) return null;
    const {
      price,
      total,
      authorReserve,
      sold,
      authorClaimed,
      name,
      uriPrefix,
    } = data;

    return {
      saleAddr: this.factoryAddress,
      name: unescape(name),
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
    const storage = await this.factory.storage();
    const searchTaskKey = {
      storyId: parseInt(chainStoryId),
      taskId: parseInt(chainTaskId)
    };
    const data = await storage['task'].get(searchTaskKey);
    if (!data) return null;
    const {
      cid,
      creator,
      nft,
      rewardNfts,
      status
    } = data;
    return {
      id: chainTaskId,
      cid,
      creator,
      nft,
      rewardNfts: rewardNfts.map((v) => v.toString()),
      status
    };
  }

  async getSubmit(
    chainStoryId: string,
    chainTaskId: string,
    chainSubmitId: string,
  ): Promise<Chain.Submit> {
    const storage = await this.factory.storage();
    const searchTaskKey = {
      storyId: parseInt(chainStoryId),
      taskId: parseInt(chainTaskId),
      submitId: parseInt(chainSubmitId)
    };
    const data = await storage['taskSubmit'].get(searchTaskKey);
    if (!data) return null;
    const {
      creator,
      status,
      cid
    } = data;
    return {
      id: chainSubmitId,
      cid,
      creator,
      status
    };
  }

  private async syncChainTaskData() {
    /**
     * sync task and submit on chain every 1 minutes
     */
    const INTERVAL = 60 * 1000;

    while (true) {
      this.logger.debug(`[syncChainTask] start`);

      const storyTasksInDb = await this._storyTaskSvc.listTasks({
        chain: this.chain,
      });
      const storyTaskSubmitsInDb = await this._storyTaskSvc.listSubmits({
        chain: this.chain,
      });
      this.logger.debug(
        `[syncChainTask] ${storyTasksInDb.length} tasks & ${storyTaskSubmitsInDb.length} submits in db`,
      );
      const nextStoryId = await this.getNextStoryId();
      for (let storyId = 1; storyId < nextStoryId; storyId++) {
        const nextTaskId = await this.getNextTaskId(storyId.toString());
        if (nextTaskId != null) {
          for (let taskId = 1; taskId < nextTaskId; taskId++) {
            // storyTask
            const storyTaskInfo = await this.getTask(storyId.toString(), taskId.toString());
            if (storyTaskInfo) {
              const exitedStoryTaskInDb = storyTasksInDb.find(
                (task) => task.chainTaskId === taskId.toString() && task.chainStoryId === storyId.toString(),
              );
              if (!exitedStoryTaskInDb){
                const taskStatus = await this.changeTaskStatus(storyTaskInfo.status);
                await this._storyTaskSvc.createTask({
                  chain: this.chain,
                  chainStoryId: storyId.toString(),
                  chainTaskId: taskId.toString(),
                  creator: storyTaskInfo.creator,
                  nft: storyTaskInfo.nft,
                  rewardNfts: storyTaskInfo.rewardNfts,
                  cid: storyTaskInfo.cid,
                  status: taskStatus,
                });
              } else {
                const taskStatus = await this.changeTaskStatus(storyTaskInfo.status);
                await this._storyTaskSvc.updateTask({
                  chain: this.chain,
                  chainStoryId: storyId.toString(),
                  chainTaskId: taskId.toString(),
                  cid: storyTaskInfo.cid,
                  status: taskStatus
                });
              }
            }
            // storyTaskSubmit
            const nextSubmitId = await this.getNextSubmitId(storyId.toString(), taskId.toString());
            if (nextSubmitId > 1) {
              for (let submitId = 1; submitId < nextSubmitId; submitId++){
                const storyTaskSubmitInfo = await this.getSubmit(storyId.toString(), taskId.toString(), submitId.toString());
                if (storyTaskSubmitInfo) {
                  const exitedStoryTaskSubmitInDb = storyTaskSubmitsInDb.find(
                    (submit) => submit.chainStoryId === storyId.toString() && submit.chainTaskId === taskId.toString() && submit.chainSubmitId === submitId.toString(),
                  );
                  if (!exitedStoryTaskSubmitInDb) {
                    const taskSubmitStatus = await this.changeTaskSubmitStatus(storyTaskSubmitInfo.status);
                    await this._storyTaskSvc.createSubmit({
                      chain: this.chain,
                      chainStoryId: storyId.toString(),
                      chainTaskId: taskId.toString(),
                      chainSubmitId: submitId.toString(),
                      creator: storyTaskSubmitInfo.creator,
                      cid: storyTaskSubmitInfo.cid,
                      status: taskSubmitStatus,
                    });
                  } else {
                    const taskSubmitStatus = await this.changeTaskSubmitStatus(storyTaskSubmitInfo.status);
                    await this._storyTaskSvc.updateSubmit({
                      chain: this.chain,
                      chainStoryId: storyId.toString(),
                      chainTaskId: taskId.toString(),
                      chainSubmitId: submitId.toString(),
                      status: taskSubmitStatus,
                    });
                  }
                }
              }
            }
          }
        }
      }
      this.logger.debug(`[syncChainTask] done`);
      await new Promise((res) => setTimeout(res, INTERVAL));
    }
  }

  private async syncChainData() {
    /**
     * sync all data on chain every 10 minutes
     */
    const INTERVAL = 100 * 60 * 1000;

    while (true) {
      this.logger.debug(`[sync] start`);
      const storiesInDb = await this._storySvc.listStories({
        chain: [this.chain],
      });
      const salesInDb = await this._storySvc.listNftSales({
        chain: [this.chain],
      });
      this.logger.debug(
        `[sync] ${storiesInDb.length} stories & ${salesInDb.length} sales in db`,
      );
      const nextStoryId = await this.getNextStoryId();
      this.logger.debug(`[sync] there is ${nextStoryId - 1} stories on chain`);

      const toCreateStories: Parameters<StoryService['createStories']>[0] = [];
      const toUpdateStories: Parameters<
        StoryService['updateStoriesContentHash']
      >[0] = [];
      const toCreateSales: Parameters<StoryService['createNftSales']>[0] = [];
      const toUpdateSales: Parameters<StoryService['updateNftSales']>[0] = [];
      for (let storyId = 1; storyId < nextStoryId; storyId++) {
        const existedStoryInDb = storiesInDb.find(
          (story) => story.chainStoryId === storyId.toString(),
        );
        // sync story
        const storyInfo = await this.getStory(storyId.toString());

        if (!existedStoryInDb) {
          // not existed in db, will create story
          toCreateStories.push({
            chain: this.chain,
            chainStoryId: storyInfo.id,
            onChainAddr: storyInfo.addr,
            author: storyInfo.author,
            contentHash: storyInfo.cid,
          });
        } else {
          // existed in db, check whether to update
          if (existedStoryInDb.contentHash !== storyInfo.cid) {
            // story cid updated, shoule update in db
            toUpdateStories.push({
              chain: this.chain,
              chainStoryId: storyInfo.id,
              contentHash: storyInfo.cid,
            });
          }
        }

        // sync sales
        const sale = await this.getStoryNftSale(storyId.toString());
        if (sale) {
          const existedSaleInDb = salesInDb.find(
            (sale) => sale.chainStoryId === storyId.toString(),
          );
          if (!existedSaleInDb) {
            // not existed in db, will create sale
            toCreateSales.push({
              chain: this.chain,
              chainStoryId: storyId.toString(),
              nftSaleAddr: this.factoryAddress,
              name: unescape(sale.name),
              uriPrefix: sale.uriPrefix,
              type: NftType.NON_FUNGIBLE_TOKEN,
              price: sale.price,
              total: sale.total,
              sold: sale.sold,
              authorClaimed: sale.authorClaimed,
              authorReserved: sale.authorReserved,
            });
          } else {
            if (
              existedSaleInDb.sold !== sale.sold ||
              existedSaleInDb.authorClaimed !== sale.authorClaimed
            ) {
              // state changed , will update sale
              toUpdateSales.push({
                ...existedSaleInDb,
                sold: sale.sold,
                authorClaimed: sale.authorClaimed,
              });
            }
          }
        }
      }

      this.logger.debug(
        `[sync] stories : ${toCreateStories.length} created ${toUpdateStories.length} updated`,
      );
      this.logger.debug(
        `[sync] sales : ${toCreateSales.length} created ${toUpdateSales.length} updated`,
      );

      await this._storySvc.createStories(toCreateStories);
      await this._storySvc.updateStoriesContentHash(toUpdateStories);
      await this._storySvc.createNftSales(toCreateSales);
      await this._storySvc.updateNftSales(toUpdateSales);

      this.logger.debug(`[sync] done`);
      await new Promise((res) => setTimeout(res, INTERVAL));
    }
  }

  private async getNextStoryId(): Promise<number> {
    const storage = await this.factory.storage();
    const data = await storage['nextId'];
    return parseInt(data.toString());
  }

  private async getNextTaskId(storyId: string): Promise<number> {
    const storage = await this.factory.storage();
    const data = await storage['storyTasks'].get(parseInt(storyId));
    if (!data) return null;
    return parseInt(data.nextTaskId.toString());
  }

  private async changeTaskStatus(taskStatus: string): Promise<StoryChainTaskStatus> {
    if (taskStatus == "TODO") {
      return StoryChainTaskStatus.Todo;
    }
    if (taskStatus == "CANCELLED") {
      return StoryChainTaskStatus.Cancelled;
    }
    if (taskStatus == "DONE") {
      return StoryChainTaskStatus.Done;
    }
  }

  private async getNextSubmitId(storyId: string, taskId: string): Promise<number> {
    const storage = await this.factory.storage();
    const searchTaskKey = {
      storyId: parseInt(storyId),
      taskId: parseInt(taskId)
    };
    const data = await storage['task'].get(searchTaskKey);
    if (!data) return null;
    return parseInt(data.nextSubmitId.toString());
  }

  private async changeTaskSubmitStatus(taskSubmitStatus: string): Promise<StoryChainTaskSubmitStatus> {
    if (taskSubmitStatus == "PEDING") {
      return StoryChainTaskSubmitStatus.PENDING;
    }
    if (taskSubmitStatus == "APPROVED") {
      return StoryChainTaskSubmitStatus.APPROVED;
    }
    if (taskSubmitStatus == "WITHDRAWED") {
      return StoryChainTaskSubmitStatus.WITHDRAWED;
    }
  }
}
