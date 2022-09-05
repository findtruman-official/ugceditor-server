import {
  InjectQueue,
  OnQueueActive,
  OnQueueCompleted,
  OnQueueFailed,
  Process,
  Processor,
} from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bull';
import {
  KlaytnBaobabEventData,
  KlaytnBaobabEventQueue,
} from './klaytn-baobab.events';
import { KlaytnBaobabService } from './klaytn-baobab.service';

@Processor(KlaytnBaobabEventQueue)
export class KlaytnBaobabEventProcessor {
  private logger = new Logger(KlaytnBaobabEventProcessor.name);

  constructor(
    private readonly svc: KlaytnBaobabService,
    @InjectQueue(KlaytnBaobabEventQueue) private readonly taskQueue: Queue,
  ) {}

  async onModuleInit() {
    this.logger.log('clean completed jobs...');
    const jobs = await this.taskQueue.getJobs(['completed']);
    await Promise.all(jobs.map(async (job) => await job.remove()));
    const failedJobs = await this.taskQueue.getJobs(['failed']);
    await Promise.all(failedJobs.map(async (job) => await job.remove()));
  }

  @Process()
  async process(job: Job<KlaytnBaobabEventData>) {
    const { data } = job;

    await this.waitUntilConfirmed(data.payload.blockNumber, 10);

    await new Promise((res) => setTimeout(res, 500)); // manually delay, prevent rpc endpoint  frequency limiting

    switch (data.type) {
      case 'story-updated':
        await this.svc.handleStoryUpdatedEvent(data.payload);
        break;

      case 'story-nft-published':
        await this.svc.handleStoryNftPublishedEvent(data.payload);
        break;

      case 'story-nft-minted':
        await this.svc.handleStoryNftMintedEvent(data.payload);
        break;

      case 'author-claimed':
        await this.svc.handleAuthorClaimed(data.payload);
        break;

      case 'task-updated':
        await this.svc.handleTaskUpdated(data.payload);
        break;

      case 'submit-updated':
        await this.svc.handleSubmitUpdated(data.payload);
        break;

      default:
        this.logger.error(`invalid event ${JSON.stringify(job.data)}`);
    }
  }

  @OnQueueActive()
  async onActive(job: Job) {
    this.logger.debug(`job active ${job.id}`);
    this.logger.debug(`job data ${JSON.stringify(job.data)}`);
  }
  @OnQueueCompleted()
  async clean(job: Job, result: any) {
    this.logger.debug(`${job.id} done`);
    await job.remove();
  }

  @OnQueueFailed()
  async onFailed(job: Job, err: Error) {
    this.logger.error(`${job.id} failed`);
    this.logger.error(err, err.stack);
  }

  private async waitUntilConfirmed(target: number, confirmedBlocks: number) {
    while (true) {
      const blockNumber = await this.svc.getBlockNumber();
      if (blockNumber >= target) {
        break;
      } else {
        this.logger.debug(
          `wait block number confirmed ${confirmedBlocks} times, current ${blockNumber}/${
            target + confirmedBlocks
          }`,
        );
        await new Promise((res) => setTimeout(res, 2000));
      }
    }
  }
}
