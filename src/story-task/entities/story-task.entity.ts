import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { StoryTaskSubmit } from './story-task-submit.entity';

export enum StoryTaskStatus {
  Todo = 'todo',
  Done = 'done',
  Cancelled = 'cancelled',
}

@Entity()
export class StoryTask {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ length: 64 })
  chain: string;

  @Index()
  @Column({ length: 128 })
  chainStoryId: string;

  @Column({ length: 256 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'enum', enum: StoryTaskStatus })
  status: StoryTaskStatus;

  @OneToMany(() => StoryTaskSubmit, (submit) => submit.task)
  submits: StoryTaskSubmit[];

  @UpdateDateColumn()
  updateTime: Date;

  @CreateDateColumn()
  createTime: Date;
}
