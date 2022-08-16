import { Field, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { NftType } from 'src/story/entities/nft-sale.entity';

registerEnumType(NftType, {
  name: 'NftType',
});

@ObjectType()
export class NftSale {
  @Field()
  chain: string;

  @Field()
  chainStoryId: string;

  @Field()
  nftSaleAddr: string;

  @Field()
  name: string;

  @Field()
  uriPrefix: string;

  @Field()
  type: NftType;

  @Field()
  price: string;

  @Field(() => Int)
  total: number;

  @Field(() => Int)
  authorReserved: number;

  @Field(() => Int)
  sold: number;

  @Field(() => Int)
  authorClaimed: number;

  @Field()
  createTime: Date;

  @Field()
  updateTime: Date;
}
