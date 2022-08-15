import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class Story {
  @PrimaryColumn({ length: 64 })
  chain: string;

  @PrimaryColumn({ length: 128 })
  chainStoryId: string;

  @Column({ nullable: false, length: 128 })
  onChainAddr: string;

  @Column({ nullable: false, length: 128 })
  author: string;

  @Column({ nullable: false, length: 128 })
  contentHash: string;

  @CreateDateColumn()
  createTime: Date;

  @UpdateDateColumn()
  updateTime: Date;
}
