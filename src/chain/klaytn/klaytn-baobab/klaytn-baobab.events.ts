export const KlaytnBaobabEventQueue = 'klaytn-baobab';
export type KlaytnBaobabEventData =
  | StoryUpdatedEvent
  | StoryNftPublishedEvent
  | StoryNftMintedEvent;
type StoryUpdatedEvent = {
  type: 'story-updated';
  payload: {
    blockNumber: number;
    id: string;
    author: string;
  };
};

type StoryNftPublishedEvent = {
  type: 'story-nft-published';
  payload: {
    blockNumber: number;
    id: string;
  };
};

type StoryNftMintedEvent = {
  type: 'story-nft-minted';
  payload: {
    blockNumber: number;
    id: string;
    minter: string;
  };
};
