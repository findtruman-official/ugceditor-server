import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IpfsService } from 'src/ipfs/ipfs.service';
import { DataSource, EntityManager, Not, Repository } from 'typeorm';
import {
  StoryChainTaskSubmit,
  StoryChainTaskSubmitStatus,
} from './entities/story-chain-task-submit.entity';
import {
  StoryChainTask,
  StoryChainTaskStatus,
} from './entities/story-chain-task.entity';

@Injectable()
export class StoryChainTaskService {
  constructor(
    private readonly _datasource: DataSource,
    private readonly _ipfsService: IpfsService,

    @InjectRepository(StoryChainTask)
    private readonly _taskRepo: Repository<StoryChainTask>,

    @InjectRepository(StoryChainTaskSubmit)
    private readonly _submitRepo: Repository<StoryChainTaskSubmit>,
  ) {}

  async createTask(opts: {
    chain: string;
    chainStoryId: string;
    chainTaskId: string;

    creator: string;
    cid: string;
    nft: string;
    rewardNfts: string[];
    status: StoryChainTaskStatus;
  }): Promise<StoryChainTask> {
    return await this._tx(async (repo) => {
      const obj = repo.task.create({
        ...opts,
      });
      const { description, title } = await this._loadTaskCid(opts.cid);
      obj.title = title;
      obj.content = description;

      return await repo.task.save(obj);
    });
  }

  // update story chain task
  async updateTask(opts: {
    chain: string;
    chainStoryId: string;
    chainTaskId: string;

    cid: string;
    status: StoryChainTaskStatus;
  }): Promise<StoryChainTask> {
    return await this._tx(async (repo) => {
      const { chain, chainStoryId, chainTaskId } = opts;
      const obj = await repo.task.findOne({
        where: { chain, chainStoryId, chainTaskId },
        lock: {
          mode: 'pessimistic_read',
        },
      });
      if (!obj) {
        throw new Error(
          `StoryChainTask not existed: chain=${chain}, chainStoryId=${chainStoryId}, chainTaskId=${chainTaskId}`,
        );
      }
      if (obj.cid !== opts.cid) {
        obj.cid = opts.cid;
        const { description, title } = await this._loadTaskCid(opts.cid);
        obj.title = title;
        obj.content = description;
      }
      obj.status = opts.status;
      return await repo.task.save(obj);
    });
  }

  async createSubmit(opts: {
    chain: string;
    chainStoryId: string;
    chainTaskId: string;
    chainSubmitId: string;

    creator: string;
    cid: string;
    status: StoryChainTaskSubmitStatus;
  }): Promise<StoryChainTaskSubmit> {
    return await this._tx(async (repo) => {
      const obj = repo.submit.create({
        ...opts,
      });
      const { content } = await this._loadSubmitCid(opts.cid);

      obj.content = content;

      return await repo.submit.save(obj);
    });
  }

  async updateSubmit(opts: {
    chain: string;
    chainStoryId: string;
    chainTaskId: string;
    chainSubmitId: string;

    status: StoryChainTaskSubmitStatus;
  }): Promise<StoryChainTaskSubmit> {
    return await this._tx(async (repo) => {
      const { chain, chainStoryId, chainSubmitId, chainTaskId } = opts;
      const obj = await repo.submit.findOne({
        where: { chain, chainStoryId, chainSubmitId, chainTaskId },
        lock: {
          mode: 'pessimistic_read',
        },
      });
      if (!obj) {
        throw new Error(
          `StoryChainTaskSubmit not existed: chain=${chain}, chainStoryId=${chainStoryId}, chainTaskId=${chainTaskId}, chainSubmitId=${chainSubmitId}`,
        );
      }
      obj.status = opts.status;
      return await repo.submit.save(obj);
    });
  }

  async getTask(opts: {
    chain: string;
    chainStoryId: string;
    chainTaskId: string;
  }): Promise<StoryChainTask | undefined> {
    return (
      (await this._taskRepo.findOne({
        where: opts,
      })) || undefined
    );
  }

  async getSubmit(opts: {
    chain: string;
    chainStoryId: string;
    chainTaskId: string;
    chainSubmitId: string;
  }): Promise<StoryChainTaskSubmit | undefined> {
    return (
      (await this._submitRepo.findOne({
        where: opts,
      })) || undefined
    );
  }

  async listTasks(opts: {
    chain: string;
    chainStoryId: string;
  }): Promise<StoryChainTask[]> {
    return await this._taskRepo.find({
      where: opts,
      order: {
        createTime: 'DESC',
      },
    });
  }

  async listSubmits(opts: {
    chain: string;
    chainStoryId: string;
    chainTaskId: string;
  }): Promise<StoryChainTaskSubmit[]> {
    return await this._submitRepo.find({
      where: {
        ...opts,
        status: Not(StoryChainTaskSubmitStatus.WITHDRAWED),
      },
      order: {
        createTime: 'DESC',
      },
    });
  }

  private async _loadTaskCid(
    cid: string,
  ): Promise<{ description: string; title: string }> {
    return await this._ipfsService.loadJson(cid);
  }

  private async _loadSubmitCid(cid: string): Promise<{ content: string }> {
    return await this._ipfsService.loadJson(cid);
  }

  private async _tx<T>(
    func: (
      repo: {
        task: Repository<StoryChainTask>;
        submit: Repository<StoryChainTaskSubmit>;
      },
      em: EntityManager,
    ) => Promise<T>,
    em?: EntityManager,
  ) {
    const exec = async (em) => {
      const repo = {
        task: em.getRepository(StoryChainTask),
        submit: em.getRepository(StoryChainTaskSubmit),
      };
      return await func(repo, em);
    };
    if (em) {
      return await exec(em);
    } else {
      return await this._datasource.transaction(async (em) => {
        return await exec(em);
      });
    }
  }
}
