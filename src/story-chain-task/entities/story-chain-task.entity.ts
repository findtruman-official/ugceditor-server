import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum StoryChainTaskStatus {
  Todo = 'todo',
  Done = 'done',
  Cancelled = 'cancelled',
}

@Entity()
export class StoryChainTask {
  @PrimaryColumn({ length: 64 })
  chain: string;

  @PrimaryColumn({ length: 128 })
  chainStoryId: string;

  @PrimaryColumn({ length: 128 })
  chainTaskId: string;

  @Column({ nullable: false, length: 128 })
  creator: string;

  @Column({ nullable: false, length: 128 })
  cid: string;

  @Column({ nullable: false, length: 128 })
  nft: string;

  @Column({ type: 'json' })
  rewardNfts: string[];

  @Column({ type: 'enum', enum: StoryChainTaskStatus })
  status: StoryChainTaskStatus;

  @Column({ length: 512 })
  title: string;

  @Column({ type: 'text' })
  content: string;

  @CreateDateColumn()
  createTime: Date;

  @UpdateDateColumn()
  updateTime: Date;
}
