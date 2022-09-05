import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum StoryChainTaskSubmitStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  WITHDRAWED = 'withdrawed',
}

@Entity()
export class StoryChainTaskSubmit {
  @PrimaryColumn({ length: 64 })
  chain: string;

  @PrimaryColumn({ length: 128 })
  chainStoryId: string;

  @PrimaryColumn({ length: 128 })
  chainTaskId: string;

  @PrimaryColumn({ length: 128 })
  chainSubmitId: string;

  @Column({ nullable: false, length: 128 })
  creator: string;

  @Column({ nullable: false, length: 128 })
  cid: string;

  @Column({ type: 'enum', enum: StoryChainTaskSubmitStatus })
  status: StoryChainTaskSubmitStatus;

  @Column({ type: 'text' })
  content: string;

  @CreateDateColumn()
  createTime: Date;

  @UpdateDateColumn()
  updateTime: Date;
}
