import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { StoryTask } from './story-task.entity';

export enum StoryTaskSubmitStatus {
  Pending = 'pending',
  Rejected = 'rejected',
  Approved = 'approved',
}

@Entity()
export class StoryTaskSubmit {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => StoryTask, { onDelete: 'CASCADE' })
  task: StoryTask;

  @Column({ length: 128 })
  account: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'enum', enum: StoryTaskSubmitStatus })
  status: StoryTaskSubmitStatus;

  @CreateDateColumn()
  createTime: Date;
}
