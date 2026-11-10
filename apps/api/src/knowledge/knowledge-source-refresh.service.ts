import { createHash } from "node:crypto";
import { load } from "cheerio";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { OpenAIEmbeddings } from "@langchain/openai";
import type { KnowledgeSourceRepository } from "./knowledge-source.repository";
import type { KnowledgeContentRepository, KnowledgeChunkInput } from "./knowledge-content.repository";

const MAX_HTML_BYTES = 2_000_000;
const MAX_SOURCE_CHUNKS = 2_000;
const ALLOWED_HOSTS: Record<string, string[]> = {
  "openai-subscription-refunds": ["help.openai.com"],
  "apple-purchase-refunds": ["support.apple.com"],
  "google-play-subscription-refunds": ["support.google.com"],
  "stripe-unknown-charge": ["support.stripe.com"],
  "us-cfpb-card-charge-dispute": ["www.consumerfinance.gov"],
  "ng-cbn-financial-complaints": ["www.cbn.gov.ng"],
};

export class KnowledgeSourceRefreshService {
  private readonly splitter = new RecursiveCharacterTextSplitter({ chunkSize: 850, chunkOverlap: 120, separators: ["\n\n", "\n", ". ", " ", ""] });
  constructor(private readonly apiKey: string | undefined, private readonly knowledgeSourceRepository: KnowledgeSourceRepository, private readonly knowledgeContentRepository: KnowledgeContentRepository) {}

  async refresh(sourceKey: string): Promise<void> {
    const source = await this.knowledgeSourceRepository.findByKey(sourceKey);
    if (!source?.enabled) return;
    try {
      if (!this.apiKey) throw new Error("OPENAI_API_KEY_REQUIRED");
      const response = await fetchSource(source);
      if (response.status === 304) return this.knowledgeContentRepository.markChecked(source.key, response.headers.get("etag") ?? source.etag, response.headers.get("last-modified") ?? source.lastModified);
      if (!response.ok) throw new Error("SOURCE_HTTP_ERROR");
      const html = await readBoundedHtml(response);
      const content = extractReadableText(html);
      if (content.length < 200) throw new Error("SOURCE_CONTENT_EMPTY");
      const contentHash = createHash("sha256").update(content).digest("hex");
      if (contentHash === source.contentHash) return this.knowledgeContentRepository.markChecked(source.key, response.headers.get("etag") ?? undefined, response.headers.get("last-modified") ?? undefined);
      const texts = await this.splitter.splitText(content);
      if (texts.length > MAX_SOURCE_CHUNKS) throw new Error("SOURCE_CHUNK_LIMIT_EXCEEDED");
      const vectors = await embedInBatches(createEmbeddings(this.apiKey), texts);
      await this.knowledgeContentRepository.saveRevision(source.key, contentHash, response.headers.get("etag") ?? undefined, response.headers.get("last-modified") ?? undefined, zipChunks(texts, vectors));
    } catch (error) {
      const code = error instanceof Error && /^[A-Z_]+$/.test(error.message) ? error.message : "SOURCE_REFRESH_FAILED";
      await this.knowledgeContentRepository.markFailure(source.key, code);
      throw error;
    }
  }
}

async function fetchSource(source: import("./knowledge-source").KnowledgeSource): Promise<Response> {
  const allowed = ALLOWED_HOSTS[source.key];
  const url = new URL(source.url);
  if (url.protocol !== "https:" || !allowed?.includes(url.hostname)) throw new Error("SOURCE_URL_NOT_ALLOWED");
  const headers = new Headers({ accept: "text/html", "user-agent": "BillAgentKnowledgeBot/1.0 (source refresh)" });
  if (source.etag) headers.set("if-none-match", source.etag);
  if (source.lastModified) headers.set("if-modified-since", source.lastModified);
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(20_000), redirect: "manual" });
  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get("location");
    if (!location) throw new Error("SOURCE_REDIRECT_INVALID");
    const redirected = new URL(location, url);
    if (redirected.protocol !== "https:" || !allowed.includes(redirected.hostname)) throw new Error("SOURCE_REDIRECT_NOT_ALLOWED");
    return fetch(redirected, { headers, signal: AbortSignal.timeout(20_000), redirect: "error" });
  }
  return response;
}

async function readBoundedHtml(response: Response): Promise<string> {
  const declaredSize = Number(response.headers.get("content-length") ?? 0);
  if (declaredSize > MAX_HTML_BYTES) throw new Error("SOURCE_TOO_LARGE");
  const reader = response.body?.getReader();
  if (!reader) throw new Error("SOURCE_BODY_MISSING");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_HTML_BYTES) { await reader.cancel(); throw new Error("SOURCE_TOO_LARGE"); }
    chunks.push(value);
  }
  return new TextDecoder().decode(concat(chunks, size));
}

function extractReadableText(html: string): string {
  const $ = load(html);
  $("script, style, nav, footer, header, aside, form, noscript, svg, iframe").remove();
  const main = $("main").text() || $("article").text() || $("body").text();
  const pageText = normalizeText(main);
  if (pageText.length >= 200) return pageText;
  const title = $("title").text();
  const description = $("meta[name='description']").attr("content")
    ?? $("meta[property='og:description']").attr("content")
    ?? "";
  return normalizeText(`${title} ${decodeHtml(description)}`);
}

function concat(parts: Uint8Array[], total: number): Uint8Array {
  const output = new Uint8Array(total); let offset = 0;
  for (const part of parts) { output.set(part, offset); offset += part.byteLength; }
  return output;
}

function zipChunks(texts: string[], vectors: number[][]): KnowledgeChunkInput[] {
  return texts.map((content, index) => ({ content, embedding: vectors[index] }));
}

async function embedInBatches(embeddings: OpenAIEmbeddings, texts: string[]): Promise<number[][]> {
  const vectors: number[][] = [];
  for (let offset = 0; offset < texts.length; offset += 64) {
    vectors.push(...await embeddings.embedDocuments(texts.slice(offset, offset + 64)));
  }
  return vectors;
}

function createEmbeddings(apiKey: string): OpenAIEmbeddings {
  return new OpenAIEmbeddings({ apiKey, model: "text-embedding-3-small", dimensions: 1536, maxRetries: 2, timeout: 30_000 });
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").replace(/\u00a0/g, " ").trim();
}

function decodeHtml(value: string): string {
  return load(`<span>${value}</span>`)("span").text();
}
