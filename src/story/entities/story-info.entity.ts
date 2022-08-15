import {
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { StoryChapter } from './story-chapter.entity';

@Entity()
@Unique('uq_story_chain_chainstoryid', ['chain', 'chainStoryId'])
export class StoryInfo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 64 })
  chain: string;

  @Column({ length: 128 })
  chainStoryId: string;

  @Column({ nullable: false, length: 128 })
  contentHash: string;

  @Column({ length: 200 })
  title: string;
  @Column({ length: 2048 })
  cover: string;
  @Column({ type: 'text' })
  description: string;

  @Column()
  createAt: Date;

  @Column()
  updateAt: Date;

  @OneToMany(() => StoryChapter, (chapter) => chapter.storyInfo)
  chapters: StoryChapter[];
}
