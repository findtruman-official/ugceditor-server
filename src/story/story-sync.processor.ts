import {
  InjectQueue,
  OnQueueCompleted,
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

  @Process()
  async process(job: Job<StorySyncData>) {
    const { chain, chainStoryId, cid } = job.data;
    const data = await this._ipfsSvc.loadJson(cid);
    try {
      await this._storySvc.updateStoryDetailsFromJson({
        chain,
        chainStoryId,
        json: data,
        contentHash: cid,
      });
    } catch (err) {
      console.error(err);
    }
  }

  @OnQueueCompleted()
  async clean(job: Job<StorySyncData>, result: any) {
    await job.remove();
  }
}
