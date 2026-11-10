import { OpenAIEmbeddings } from "@langchain/openai";
import type { KnowledgeContentRepository, KnowledgeChunkMatch } from "./knowledge-content.repository";

const MAX_RESULTS = 5;
const MIN_SIMILARITY = 0.42;

export class KnowledgeRetrievalService {
  constructor(private readonly apiKey: string | undefined, private readonly knowledgeContentRepository: KnowledgeContentRepository) {}
  async search(query: string): Promise<KnowledgeChunkMatch[]> {
    if (!this.apiKey) throw new Error("OPENAI_API_KEY is required for knowledge retrieval");
    const embedding = await createEmbeddings(this.apiKey).embedQuery(query);
    const matches = await this.knowledgeContentRepository.search(embedding, MAX_RESULTS);
    return matches.filter(({ similarity }) => similarity >= MIN_SIMILARITY);
  }
}

function createEmbeddings(apiKey: string): OpenAIEmbeddings {
  return new OpenAIEmbeddings({ apiKey, model: "text-embedding-3-small", dimensions: 1536, maxRetries: 2, timeout: 20_000 });
}
