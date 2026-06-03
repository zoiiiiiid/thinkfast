type FeedCard = {
  id: string;
  user_id: string;
  conversation_id?: string;
  card_type: string;
  title: string;
  description: string;
  suggested_action: string;
  created_at: string;
  dismissed: boolean;
};

type Conversation = {
  id: string;
  user_id: string;
  title: string;
  original_prompt: string | null;
  redacted_prompt: string;
  ai_response: string;
  summary: string;
  selected_mode: string;
  privacy_risk: string;
  idea_prompt_needed: boolean;
  created_at: string;
  updated_at: string;
};

type ConversationMessage = {
  id: string;
  conversation_id: string;
  user_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  title?: string | null;
  summary?: string | null;
  tags?: string[];
  created_at: string;
};

type Board = {
  id: string;
  user_id: string;
  name: string;
  description: string;
  created_at: string;
};

export const mockStore: {
  feedCards: FeedCard[];
  conversations: Conversation[];
  conversationMessages: Record<string, ConversationMessage[]>;
  boards: Board[];
  conversationBoards: { id: string; conversation_id: string; board_id: string; created_at: string }[];
} = {
  feedCards: [],
  conversations: [],
  conversationMessages: {},
  boards: [],
  conversationBoards: [],
};
