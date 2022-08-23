export const KlaytnBaobabEventQueue = 'klaytn-baobab';
export type KlaytnBaobabEventData =
  | StoryUpdatedEvent
  | StoryNftPublishedEvent
  | StoryNftMintedEvent;
type StoryUpdatedEvent = {
  type: 'story-updated';
  payload: {
    id: string;
    author: string;
  };
};

type StoryNftPublishedEvent = {
  type: 'story-nft-published';
  payload: {
    id: string;
  };
};

type StoryNftMintedEvent = {
  type: 'story-nft-minted';
  payload: {
    id: string;
    minter: string;
  };
};
