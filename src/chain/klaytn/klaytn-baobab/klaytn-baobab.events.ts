export const KlaytnBaobabEventQueue = 'klaytn-baobab';
export type KlaytnBaobabEventData =
  | StoryUpdatedEvent
  | StoryNftPublishedEvent
  | StoryNftMintedEvent
  | AuthorClaimedEvent
  | TaskUpdatedEvent
  | SubmitUpdatedEvent;
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

type AuthorClaimedEvent = {
  type: 'author-claimed';
  payload: {
    blockNumber: number;
    storyId: string;
    amount: string;
  };
};

type TaskUpdatedEvent = {
  type: 'task-updated';
  payload: {
    blockNumber: number;
    storyId: string;
    taskId: string;
  };
};

type SubmitUpdatedEvent = {
  type: 'submit-updated';
  payload: {
    blockNumber: number;
    storyId: string;
    taskId: string;
    submitId: string;
  };
};
