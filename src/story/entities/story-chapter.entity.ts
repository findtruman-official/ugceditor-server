import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { StoryInfo } from './story-info.entity';

@Entity()
export class StoryChapter {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 200 })
  name: string;

  @Column({ type: 'text' })
  content: string;

  @Column()
  createAt: Date;

  @Column()
  updateAt: Date;

  @ManyToOne(() => StoryInfo, { onDelete: 'CASCADE' })
  storyInfo: StoryInfo;
}
