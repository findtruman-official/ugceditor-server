import { Injectable, Logger } from '@nestjs/common';
import { StoryService } from '../../../story/story.service';
import { ConfigService } from '@nestjs/config';
import * as nearAPI from "near-api-js";
import { Near } from 'near-api-js';
import { NftType } from '../../../story/entities/nft-sale.entity';
import { StoryChainTaskService } from '../../../story-chain-task/story-chain-task.service';
import { StoryChainTaskStatus } from '../../../story-chain-task/entities/story-chain-task.entity';
import { StoryChainTaskSubmitStatus } from '../../../story-chain-task/entities/story-chain-task-submit.entity';

@Injectable()
export class NearTestnetService implements Chain.ChainIntegration {
  public chain = 'near';
  public name = 'Near(testnet)';
  public taskModule: Chain.TaskModuleType = 'chain';
  public factoryAddress = '';
  public findsAddress = '';
  public enabled = true;
  public nearConnection = new Near({ networkId: 'testnet', nodeUrl: 'https://rpc.testnet.near.org' });
  public viewAccount;
  public contract;
  public INTERVALS;
  public ws;
  private logger = new Logger(NearTestnetService.name);

  constructor(
    private readonly _storySvc: StoryService,
    private readonly _configSvc: ConfigService,
    private readonly _storyTaskSvc: StoryChainTaskService,
  ) {}

  async onModuleInit() {
    this.enabled = this._configSvc.get('NEAR_TESTNET_ENABLE') === 'true';
    if (!this.enabled) return;
    this.factoryAddress = this._configSvc.get(
      'NEAR_TESTNET_FACTORY_ADDRESS',
    );
    this.findsAddress = this._configSvc.get('NEAR_TESTNET_FINDS');
    const enableSync =
      this._configSvc.get('NEAR_TESTNET_ENABLE_SYNC') === 'true';
    const endpoint = this._configSvc.get('NEAR_TESTNET_ENDPOINT');
    this.viewAccount = this._configSvc.get('NEAR_TESTNET_VIEW_ACCOUNT');
    this.INTERVALS = this._configSvc.get('NEAR_TESTNET_SYNC_TIME');
    const enableListenEvents = this._configSvc.get('NEAR_TESTNET_LISTEN_EVENTS');

    const WebSocket = require('ws');
    this.ws = new WebSocket("wss://events.near.stream/ws");

    const { connect, Contract } = nearAPI;
    const connectionConfig = {
      networkId: "testnet",
      nodeUrl: endpoint,
      walletUrl: "https://wallet.testnet.near.org",
      helperUrl: "https://helper.testnet.near.org",
      explorerUrl: "https://explorer.testnet.near.org",
    };
    this.nearConnection = await connect(connectionConfig);
    this.contract = new Contract(
      await this.nearConnection.account(this.viewAccount),
      this.factoryAddress,
      {
        viewMethods:["getStoryIdInfo", "getStoryIdNftSale", "get_nextStoryId", "get_task", "get_submit", "get_nextTaskId", "get_nextSubmitId"],
        changeMethods:[],
      }
    )

    if (enableSync) {
      this.syncChainData().catch((err) => {
        this.logger.error(`nearSync chain data failed`, err);
      });
      this.syncChainTaskData().catch((err) => {
        this.logger.error(`nearSync chain task data failed`, err);
      });
    }
    if (enableListenEvents) {
      await this.listenToEvents();
    }
  }

  async isPkAccountMatched(pubkey: string, account: string): Promise<boolean> {
    return true;
  }

  async isValidSignature(
    params: Chain.IsValidSignatureParams,
  ): Promise<boolean> {
    return true;
  }

  async formatGeneralMetadatas(
    metadatas: Chain.GeneralMetadata[],
  ): Promise<Chain.MetadataJsonFile[]> {
    return metadatas.map((md) => ({
      item: md,
      json: {
        title: unescape(md.name),
        description: unescape(md.description),
        media: md.image,
        // Not required by the Near metadatas standard
        image: md.image,
      },
    }));
  }

  async getStory(chainStoryId: string): Promise<Chain.Story> {
    const storyIdInfo = await this.contract.getStoryIdInfo(
      {
        storyId: parseInt(chainStoryId),
      }
    );
    return {
      id: chainStoryId,
      cid: storyIdInfo.cid,
      author: storyIdInfo.author,
      addr: this.factoryAddress,
    };
  }
  async getStoryNftSale(chainStoryId: string): Promise<Chain.NftSale> {
    const storyNftInfo = await this.contract.getStoryIdNftSale(
      {
        storyId: parseInt(chainStoryId),
      }
    );
    if (!storyNftInfo) return null;
    return {
      saleAddr: this.factoryAddress,
      name: storyNftInfo.name,
      uriPrefix: storyNftInfo.uriPrefix,
      type: '721',
      price: storyNftInfo.price.toString(),
      total: parseInt(storyNftInfo.total.toString()),
      authorClaimed: parseInt(storyNftInfo.authorClaimed.toString()),
      sold: parseInt(storyNftInfo.sold.toString()),
      authorReserved: parseInt(storyNftInfo.authorReserve.toString()),
    };
  }
  async getTask(
    chainStoryId: string,
    chainTaskId: string,
  ): Promise<Chain.Task> {
    const taskInfo = await this.contract.get_task(
      {
        storyId: parseInt(chainStoryId),
        taskId: parseInt(chainTaskId)
      }
    );
    if (!taskInfo) return null;
    let rewardNfts = []
    if (taskInfo.rewardNfts != null){
      const Nfts = taskInfo.rewardNfts.split(",").filter(v=>v!=="");
      for (let i=0; i<Nfts.length; i++){
        rewardNfts.push(parseInt(Nfts[i]))
      }

    }
    return {
      id: chainTaskId,
      cid: taskInfo.cid,
      creator: taskInfo.creator,
      nft: taskInfo.nft,
      rewardNfts: rewardNfts.map((v) => v.toString()),
      status: taskInfo.status,
    };
  }
  async getSubmit(
    chainStoryId: string,
    chainTaskId: string,
    chainSubmitId: string,
  ): Promise<Chain.Submit> {
    const submitInfo = await this.contract.get_submit(
      {
        storyId: parseInt(chainStoryId),
        taskId: parseInt(chainTaskId),
        submitId: parseInt(chainSubmitId)
      }
    );
    if (!submitInfo) return null;
    return {
      id: chainSubmitId,
      cid: submitInfo.cid,
      creator: submitInfo.creator,
      status: submitInfo.status
    };
  }

  private async syncChainData() {
    /**
     * sync story data on chain every 30s
     */
    const INTERVALS = this.INTERVALS * 1000;
    while (true) {
      try {

        this.logger.debug(`[nearSync] start`);
        const storiesInDb = await this._storySvc.listStories({
          chain: [this.chain],
        });
        const salesInDb = await this._storySvc.listNftSales({
          chain: [this.chain],
        });
        this.logger.debug(
          `[nearSync] ${storiesInDb.length} stories & ${salesInDb.length} sales in db`,
        );
        const nextStoryId = await this.contract.get_nextStoryId({});
        this.logger.debug(
          `[nearSync] there is ${nextStoryId - 1} stories on chain`
        );
        const toCreateStories: Parameters<StoryService['createStories']>[0] = [];
        const toUpdateStories: Parameters<StoryService['updateStoriesContentHash']>[0] = [];
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
          `[nearSync] stories : ${toCreateStories.length} created ${toUpdateStories.length} updated`,
        );
        this.logger.debug(
          `[nearSync] sales : ${toCreateSales.length} created ${toUpdateSales.length} updated`,
        );
        await this._storySvc.createStories(toCreateStories);
        await this._storySvc.updateStoriesContentHash(toUpdateStories);
        await this._storySvc.createNftSales(toCreateSales);
        await this._storySvc.updateNftSales(toUpdateSales);
        this.logger.debug(`[nearSync] done`);
      }
      catch (e) {
        this.logger.error(`nearSync Near chain data failed`, e);
      }
      finally {
        await new Promise((res) => setTimeout(res, INTERVALS));
      }
    }
  }

  private async syncChainTaskData() {
    /**
     * sync task and submit on chain every 30s
     */
    const INTERVALS = this.INTERVALS * 1000;
    while (true) {
      try {
        this.logger.debug(`[nearSyncChainTask] start`);
        const storyTasksInDb = await this._storyTaskSvc.listTasks({
          chain: this.chain,
        });
        const storyTaskSubmitsInDb = await this._storyTaskSvc.listSubmits({
          chain: this.chain,
        });
        this.logger.debug(
          `[nearSyncChainTask] ${storyTasksInDb.length} tasks & ${storyTaskSubmitsInDb.length} submits in db`,
        );
        this.logger.debug("—————— 开始获取 nextStoryId")
        const nextStoryId = await this.contract.get_nextStoryId({});
        for (let storyId = 1; storyId < nextStoryId; storyId++) {
          this.logger.debug("—————— 开始获取 get_nextTaskId")
          const nextTaskId = await this.contract.get_nextTaskId(
            {
              storyId: storyId
            }
          );
          if (nextTaskId != null) {
            for (let taskId = 1; taskId < nextTaskId; taskId++) {
              // storyTask
              this.logger.debug("—————— 开始获取 getTask storyId：" + storyId.toString() + " taskId：" + taskId.toString())
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
              this.logger.debug("—————— 开始获取 nextSubmitId")
              const nextSubmitId = await this.contract.get_nextSubmitId(
                {
                  storyId: storyId,
                  taskId: taskId
                }
              );
              console.log(nextSubmitId)
              if (nextSubmitId > 1) {
                for (let submitId = 1; submitId < nextSubmitId; submitId++){
                  this.logger.debug("—————— 开始获取 getSubmit taskId：" + taskId.toString() + " submitId：" + submitId.toString())
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
        this.logger.debug(`[nearSyncChainTask] done`);
      }
      catch (e) {
        this.logger.error(`sync Near chain task data failed`, e);
      }
      finally {
        await new Promise((res) => setTimeout(res, INTERVALS));
      }
    }
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

  private async listenToEvents() {
    const nftFilter = [{
      account_id: this.factoryAddress,
      status: "SUCCESS",
      event: {
        standard: "nep171",
        event: "publish_story",
      },
    },{
      account_id: this.factoryAddress,
      status: "SUCCESS",
      event: {
        standard: "nep171",
        event: "update_story",
      },
    },{
      account_id: this.factoryAddress,
      status: "SUCCESS",
      event: {
        standard: "nep171",
        event: "publish_storyNft",
      },
    },{
      account_id: this.factoryAddress,
      status: "SUCCESS",
      event: {
        standard: "nep171",
        event: "mint_nft",
      },
    },{
      account_id: this.factoryAddress,
      status: "SUCCESS",
      event: {
        standard: "nep171",
        event: "mint_authorReservedNft",
      },
    },{
      account_id: this.factoryAddress,
      status: "SUCCESS",
      event: {
        standard: "nep171",
        event: "create_task",
      },
    },{
      account_id: this.factoryAddress,
      status: "SUCCESS",
      event: {
        standard: "nep171",
        event: "update_task",
      },
    },{
      account_id: this.factoryAddress,
      status: "SUCCESS",
      event: {
        standard: "nep171",
        event: "cancel_task",
      },
    },{
      account_id: this.factoryAddress,
      status: "SUCCESS",
      event: {
        standard: "nep171",
        event: "create_submit",
      },
    },{
      account_id: this.factoryAddress,
      status: "SUCCESS",
      event: {
        standard: "nep171",
        event: "cancel_submit",
      },
    },{
      account_id: this.factoryAddress,
      status: "SUCCESS",
      event: {
        standard: "nep171",
        event: "done_submit",
      },
    }];

    this.ws.onopen = () => {
      console.log(`Connection to WS has been established`);
      this.ws.send(
        JSON.stringify({
          secret: "ohyeahnftsss",
          filter: nftFilter,
          fetch_past_events: 10,
        })
      );
    };
    this.ws.onclose = () => {
      console.log(`WS Connection has been closed`);
      this.listenToEvents();
    };
    this.ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      console.log(data)
      for (let i = 0; i < 10; i++){ //10？
        if (data.events[i] != undefined) {
          if (data.events[i].event != undefined) {
            const event = data.events[i].event.event
            if (event == "publish_story" || event == "update_story" || event == "publish_storyNft" || event == "mint_nft" || event == "mint_authorReservedNft") {
              const storyId = data.events[i].event.date[0].storyId
              this.synchronousOperation(event, storyId.toString())
            }
            if (event == "create_task" || event == "update_task" || event == "cancel_task") {
              const storyId = data.events[i].event.date[0].storyId
              const taskId = data.events[i].event.date[0].taskId
              this.synchronousOperation(event, storyId.toString(), taskId.toString())
            }
            if (event == "create_submit" || event == "cancel_submit" || event == "done_submit") {
              const storyId = data.events[i].event.date[0].storyId
              const taskId = data.events[i].event.date[0].taskId
              const submitId = data.events[i].event.date[0].submitId
              this.synchronousOperation(event, storyId.toString(), taskId.toString(), submitId.toString())
            }
          }
        }
      }
    };
    this.ws.onerror = (err) => {
      console.log("WebSocket error", err);
      this.listenToEvents();
    };
  }

  private async synchronousOperation(event: string, storyId?: string, taskId?: string, submitId?: string) {
    const toCreateStories: Parameters<StoryService['createStories']>[0] = [];
    const toUpdateStories: Parameters<StoryService['updateStoriesContentHash']>[0] = [];
    const toCreateSales: Parameters<StoryService['createNftSales']>[0] = [];
    const toUpdateSales: Parameters<StoryService['updateNftSales']>[0] = [];
    if (event == "publish_story") {
      const storyInfo = await this.getStory(storyId);
      toCreateStories.push({
        chain: this.chain,
        chainStoryId: storyInfo.id,
        onChainAddr: storyInfo.addr,
        author: storyInfo.author,
        contentHash: storyInfo.cid,
      });
    }
    if (event == "update_story"){
      const storyInfo = await this.getStory(storyId);
      toUpdateStories.push({
        chain: this.chain,
        chainStoryId: storyInfo.id,
        contentHash: storyInfo.cid,
      });
    }
    if (event == "publish_storyNft"){
      const sale = await this.getStoryNftSale(storyId);
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
    }
    if (event == "mint_nft" || event == "mint_authorReservedNft"){
      const sale = await this.getStoryNftSale(storyId);
      toUpdateSales.push({
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
    }
    await this._storySvc.createStories(toCreateStories);
    await this._storySvc.updateStoriesContentHash(toUpdateStories);
    await this._storySvc.createNftSales(toCreateSales);
    await this._storySvc.updateNftSales(toUpdateSales);
    if (event == "create_task"){
      const storyTaskInfo = await this.getTask(storyId, taskId);
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
    }
    if (event == "update_task" || event == "cancel_task"){
      const storyTaskInfo = await this.getTask(storyId, taskId);
      const taskStatus = await this.changeTaskStatus(storyTaskInfo.status);
      await this._storyTaskSvc.updateTask({
        chain: this.chain,
        chainStoryId: storyId.toString(),
        chainTaskId: taskId.toString(),
        cid: storyTaskInfo.cid,
        status: taskStatus
      });
    }
    if (event == "create_submit"){
      const storyTaskSubmitInfo = await this.getSubmit(storyId, taskId, submitId);
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
    }
    if (event == "cancel_submit" || event == "done_submit"){
      const storyTaskSubmitInfo = await this.getSubmit(storyId, taskId, submitId);
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
