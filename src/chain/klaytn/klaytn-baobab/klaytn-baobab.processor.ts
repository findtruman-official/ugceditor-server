import { InjectQueue, Process, Processor } from '@nestjs/bull';
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
  }

  @Process()
  async process(job: Job<KlaytnBaobabEventData>) {
    const { data } = job;
    this.logger.debug(`handle job ${job.id}`);
    this.logger.debug(`${JSON.stringify(job.data)}`);
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

      default:
        this.logger.error(`invalid event ${JSON.stringify(job.data)}`);
    }
  }
}
