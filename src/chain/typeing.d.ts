interface ChainIntegration {
  /**
   * chain identifier. eg. 'solana-devnet'
   */
  chain: string;

  /**
   * chain readable name. eg. 'Solana(Devnet)'
   */
  name: string;

  /**
   * Story Factory address on chain
   */
  factoryAddress: string;

  /**
   * $Finds Token address
   */
  findsAddress: string;

  /**
   * verify the signature is account signed
   */
  isValidSignature: (params: IsValidSignatureParams) => Promise<boolean>;

  /**
   * Convert NFT metadata into an on-chain specific format
   * (which will be finally stored it on the IPFS network)
   */
  formatGeneralMetadatas: (
    metadatas: GeneralMetadata[],
  ) => Promise<MetadataJsonFile[]>;

  /**
   * Returns null if the story does not exist
   */
  getStory: (chainStoryId: string) => Promise<Story>;

  /**
   * Returns null if the story does not exist
   */
  getStoryNftSale: (chainStoryId: string) => Promise<NftSale>;
}

type IsValidSignatureParams = {
  signature: string;
  account: string;
  message: string;
};

type GeneralMetadata = {
  tokenId: number;
  name: string;
  description: string;
  image: string;
};

type MetadataJsonFile = {
  item: GeneralMetadata['items'][0];
  json: any;
};

type Story = {
  id: string;
  cid: string;
  author: string;
  addr: string;
};

type NftSale = {
  saleAddr: string;
  name: string;
  uriPrefix: string;
  type: '721';
  price: string;
  total: number;
  authorReserved: number;
  sold: number;
  authorClaimed: number;
};
