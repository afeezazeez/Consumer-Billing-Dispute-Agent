export interface DashboardUser {
  id: string;
  email: string;
  displayName: string;
  pictureUrl: string;
}

export interface CaseSummary {
  id: string;
  title: string;
  status: string;
  updatedAt: string;
  lastMessage: string;
}

export interface CaseMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface CaseConversation extends CaseSummary {
  createdAt: string;
  messages: CaseMessage[];
}
