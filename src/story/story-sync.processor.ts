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
import { IpfsService } from 'src/ipfs/ipfs.service';
import { StorySyncData, StorySyncQueue } from './story.events';
import { StoryService } from './story.service';

@Processor(StorySyncQueue)
export class StorySyncProcessor {
  private logger = new Logger(StorySyncProcessor.name);

  constructor(
    // private readonly svc: RpgService,
    @InjectQueue(StorySyncQueue)
    private readonly taskQueue: Queue<StorySyncData>,

    private readonly _ipfsSvc: IpfsService,
    private readonly _storySvc: StoryService,
  ) {}

  async onModuleInit() {
    this.logger.log('clean completed jobs...');
    const jobs = await this.taskQueue.getJobs(['completed']);
    await Promise.all(jobs.map(async (job) => await job.remove()));
  }

  @OnQueueActive()
  async onActive(job: Job<StorySyncData>) {
    this.logger.debug(`${job.id} ${JSON.stringify(job.data)} active`);
  }

  @Process()
  async process(job: Job<StorySyncData>) {
    const { chain, chainStoryId } = job.data;
    const story = await this._storySvc.getStory({ chain, chainStoryId });
    const data = await this._ipfsSvc.loadJson(story.contentHash);

    await this._storySvc.updateStoryDetailsFromJson({
      chain,
      chainStoryId,
      json: data,
      contentHash: story.contentHash,
    });
  }

  @OnQueueCompleted()
  async clean(job: Job<StorySyncData>, result: any) {
    this.logger.debug(`${job.id} ${JSON.stringify(job.data)} done`);
    await job.remove();
  }

  @OnQueueFailed()
  async onFailed(job: Job<StorySyncData>, err: Error) {
    this.logger.warn(`${job.id} ${JSON.stringify(job.data)} failed`);
    this.logger.warn(err);
  }
}
