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

  formatGeneralMetadatas: (
    metadatas: GeneralMetadata[],
  ) => Promise<MetadataJsonFile[]>;
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
