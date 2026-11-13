import type { AppConfig } from "../config";
import { OpenAiDocumentExtractor } from "../ai/openai-document-extractor";
import { OpenAiAgent } from "../ai/openai-agent";
import { createAgentWorkflowCheckpointer } from "../ai/agent-workflow-checkpointer";
import { createAgentTools } from "../ai/tools/agent-tools.registry";
import { TypeOrmCaseRepository } from "../database/typeorm-case.repository";
import { TypeOrmDocumentReviewRepository } from "../database/typeorm-document-review.repository";
import { TypeOrmKnowledgeContentRepository } from "../database/typeorm-knowledge-content.repository";
import { TypeOrmKnowledgeSourceRepository } from "../database/typeorm-knowledge-source.repository";
import { TypeOrmUserRepository } from "../database/typeorm-user.repository";
import { CaseAttachmentCleanup } from "../database/case-attachment-cleanup";
import { DocumentReviewService } from "../documents/document-review.service";
import { KnowledgeRetrievalService } from "../knowledge/knowledge-retrieval.service";
import { KnowledgeSourceRefreshService } from "../knowledge/knowledge-source-refresh.service";
import { CaseService } from "./case.service";
import { AttachmentService } from "../storage/attachment.service";
import { CloudinaryAttachmentStorage } from "../storage/cloudinary-attachment-storage";
import type { DataSource } from "typeorm";
import { createGmailConnectorService } from "../connectors/gmail/create-gmail-connector-service";

export function createCaseServices(config: AppConfig, dataSource: DataSource) {
  const caseRepository = new TypeOrmCaseRepository(dataSource);
  const knowledgeContentRepository = new TypeOrmKnowledgeContentRepository(dataSource);
  const knowledgeRetrievalService = new KnowledgeRetrievalService(config.openAiApiKey, knowledgeContentRepository);
  const emailConnector = createGmailConnectorService(config, dataSource);
  const workflowPersistence = createAgentWorkflowCheckpointer(config.database);
  const caseIntakeAgent = new OpenAiAgent(
    config.openAiApiKey,
    config.openAiModel,
    createAgentTools(knowledgeRetrievalService),
    workflowPersistence.checkpointer,
    emailConnector,
    workflowPersistence.clearTurn,
  );
  const storage = new CloudinaryAttachmentStorage(config.cloudinary, "bill-agent/case-attachments");
  const cleanup = new CaseAttachmentCleanup(dataSource, storage);
  const attachmentService = new AttachmentService(storage, (publicId) => cleanup.enqueue(publicId));
  const documentReviewService = new DocumentReviewService(
    new TypeOrmDocumentReviewRepository(dataSource),
    new OpenAiDocumentExtractor(config.openAiApiKey, config.openAiModel),
    async (userId, attachmentId) => {
      const attachment = await caseRepository.findAttachment(userId, attachmentId);
      return attachment ? attachmentService.read(attachment) : undefined;
    },
  );
  return {
    caseService: new CaseService(caseRepository, caseIntakeAgent, attachmentService, documentReviewService, emailConnector),
    documentReviewService,
    userRepository: new TypeOrmUserRepository(dataSource),
    knowledgeSourceRepository: new TypeOrmKnowledgeSourceRepository(dataSource),
    knowledgeSourceRefreshService: new KnowledgeSourceRefreshService(config.openAiApiKey, new TypeOrmKnowledgeSourceRepository(dataSource), knowledgeContentRepository),
    initializeAgentWorkflow: () => workflowPersistence.initialize(),
    clearAgentWorkflowTurn: (caseId: string, messageId: string) => workflowPersistence.clearTurn(caseId, messageId),
    closeAgentWorkflow: () => workflowPersistence.close(),
    startCleanup: () => cleanup.start(),
  };
}
