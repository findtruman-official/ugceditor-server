import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import {
  StoryTaskSubmit,
  StoryTaskSubmitStatus,
} from './entities/story-task-submit.entity';
import { StoryTask, StoryTaskStatus } from './entities/story-task.entity';

@Injectable()
export class StoryTaskService {
  constructor(
    private readonly _datasource: DataSource,
    @InjectRepository(StoryTask)
    private readonly _taskRepo: Repository<StoryTask>,
    @InjectRepository(StoryTaskSubmit)
    private readonly _submitRepo: Repository<StoryTaskSubmit>,
  ) {}

  // list story tasks
  async listStoryTasks(params: {
    chain: string;
    chainStoryId: string;
  }): Promise<StoryTask[]> {
    return await this._taskRepo.find({
      where: {
        chain: params.chain,
        chainStoryId: params.chainStoryId,
      },
      order: {
        createTime: 'desc',
      },
    });
  }
  // get story task
  async getStoryTask(id: number): Promise<StoryTask | null> {
    return await this._taskRepo.findOneBy({ id });
  }
  // create story task
  async createStoryTask(data: {
    chain: string;
    chainStoryId: string;
    title: string;
    description: string;
  }): Promise<StoryTask> {
    const obj = this._taskRepo.create({
      ...data,
      status: StoryTaskStatus.Todo,
    });
    return await this._taskRepo.save(obj);
  }
  // update story task
  async updateStoryTask(data: {
    id: number;
    title?: string;
    description?: string;
  }): Promise<StoryTask> {
    return await this._tx(async (repo) => {
      const obj = await repo.task.findOneBy({ id: data.id });
      if (!obj) return obj;
      if (obj.status !== StoryTaskStatus.Todo) return obj;

      if (data.title) obj.title = data.title;
      if (data.description) obj.description = data.description;
      return await repo.task.save(obj);
    });
  }
  // cancel story task
  async cancelStoryTask(id: number): Promise<StoryTask> {
    return await this._tx(async (repo) => {
      const obj = await repo.task.findOne({
        where: { id: id },
        lock: { mode: 'pessimistic_read' },
      });
      if (!obj) return obj;
      if (obj.status !== StoryTaskStatus.Todo) return obj;
      obj.status = StoryTaskStatus.Cancelled;
      return await repo.task.save(obj);
    });
  }
  // done story task
  async doneStoryTask(data: {
    id: number;
    submitIds: number[];
  }): Promise<StoryTask> {
    if (data.submitIds.length === 0) {
      throw new Error('submitIds is empty');
    }

    return await this._tx(async (repo) => {
      let submitIds = data.submitIds;
      const obj = await repo.task.findOne({
        where: {
          id: data.id,
        },
        lock: {
          mode: 'pessimistic_read',
        },
        relations: ['submits'],
      });
      if (!obj) return obj;
      if (obj.status !== StoryTaskStatus.Todo) return obj;

      for (const submitObj of obj.submits) {
        if (submitIds.includes(submitObj.id)) {
          submitIds = submitIds.filter((s) => s !== submitObj.id);
          if (submitObj.status === StoryTaskSubmitStatus.Pending) {
            submitObj.status = StoryTaskSubmitStatus.Approved;
            await repo.submit.save(submitObj);
          }
        } else {
          if (submitObj.status === StoryTaskSubmitStatus.Pending) {
            submitObj.status = StoryTaskSubmitStatus.Rejected;
            await repo.submit.save(submitObj);
          }
        }
      }
      if (submitIds.length > 0) {
        throw new Error(`invalid submitId ${JSON.stringify(submitIds)}`);
      }
      obj.status = StoryTaskStatus.Done;
      return await repo.task.save(obj);
    });
  }

  async getStoryTaskSubmit(id: number): Promise<StoryTaskSubmit> {
    return await this._submitRepo.findOneBy({ id });
  }
  // list story task submits
  async listStoryTaskSubmits(
    taskId: number,
    { withTask = false }: { withTask?: boolean } = {},
  ): Promise<StoryTaskSubmit[]> {
    return await this._submitRepo.find({
      where: {
        task: {
          id: taskId,
        },
      },
      order: {
        createTime: 'desc',
      },
      relations: withTask ? ['task'] : [],
    });
  }
  // create story task submit
  async createStoryTaskSubmit(data: {
    taskId: number;
    account: string;
    content: string;
  }): Promise<StoryTaskSubmit> {
    return await this._tx(async (repo) => {
      const obj = await repo.task.findOne({
        where: { id: data.taskId },
        lock: { mode: 'pessimistic_read' },
      });
      if (!obj) {
        throw new Error('invalid taskId');
      }
      if (obj.status !== StoryTaskStatus.Todo) {
        throw new Error("story task status is not 'todo'");
      }
      const submitObj = repo.submit.create({
        task: obj,
        account: data.account,
        content: data.content,
        status: StoryTaskSubmitStatus.Pending,
      });
      return await repo.submit.save(submitObj);
    });
  }
  // remove story task submit
  async removeStoryTaskSubmit(data: { submitId: number }): Promise<void> {
    await this._tx(async (repo) => {
      const submitObj = await repo.submit.findOne({
        where: { id: data.submitId },
        lock: { mode: 'pessimistic_read' },
        relations: ['task'],
      });
      if (!submitObj) {
        throw new Error('invalid submitId');
      }
      if (submitObj.status !== StoryTaskSubmitStatus.Pending) {
        throw new Error("story task submit status is not 'pending'");
      }
      await repo.submit.remove(submitObj);
    });
  }
  private async _tx<T>(
    func: (
      repo: {
        task: Repository<StoryTask>;
        submit: Repository<StoryTaskSubmit>;
      },
      em: EntityManager,
    ) => Promise<T>,
    em?: EntityManager,
  ) {
    const exec = async (em) => {
      const repo = {
        task: em.getRepository(StoryTask),
        submit: em.getRepository(StoryTaskSubmit),
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
