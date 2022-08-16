import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum NftType {
  NON_FUNGIBLE_TOKEN,
}

@Entity()
export class NftSale {
  @PrimaryColumn({ length: 64 })
  chain: string;

  @PrimaryColumn({ length: 128 })
  chainStoryId: string;

  @PrimaryColumn({ length: 128 })
  nftSaleAddr: string;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 2048 })
  uriPrefix: string;

  @Column()
  type: NftType;

  @Column()
  price: string;

  @Column()
  total: number;

  @Column()
  authorReserved: number;

  @Column()
  sold: number;

  @Column()
  authorClaimed: number;

  @CreateDateColumn()
  createTime: Date;

  @UpdateDateColumn()
  updateTime: Date;
}
