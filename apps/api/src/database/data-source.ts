import { AddDocumentReview1710000000011 } from "./migrations/1710000000011-AddDocumentReview";
import { AddMessageNextAction1710000000012 } from "./migrations/1710000000012-AddMessageNextAction";
import { StageCaseAttachments1710000000010 } from "./migrations/1710000000010-StageCaseAttachments";
import { StoreCaseAttachmentsInCloudinary1710000000009 } from "./migrations/1710000000009-StoreCaseAttachmentsInCloudinary";
import { caseAttachmentSchema } from "./entities/case-attachment.entity";
import { CreateCaseAttachments1710000000008 } from "./migrations/1710000000008-CreateCaseAttachments";
import { DataSource } from "typeorm";
import { CreateBillingCases1710000000001 } from "./migrations/1710000000001-CreateBillingCases";
import type { PostgresConfig } from "../config";
import { CreateUsers1710000000000 } from "./migrations/1710000000000-CreateUsers";
import { AddCaseIntakeState1710000000002 } from "./migrations/1710000000002-AddCaseIntakeState";
import { AddCaseMessageProcessingStatus1710000000003 } from "./migrations/1710000000003-AddCaseMessageProcessingStatus";
import { AddAgentMessageSourcesAndActivities1710000000004 } from "./migrations/1710000000004-AddAgentMessageSourcesAndActivities";
import { CreateAgentTurnJobs1710000000005 } from "./migrations/1710000000005-CreateAgentTurnJobs";
import { AddProvisionalCaseTitle1710000000006 } from "./migrations/1710000000006-AddProvisionalCaseTitle";
import { AddCaseNextAction1710000000007 } from "./migrations/1710000000007-AddCaseNextAction";
import { caseMessageSchema, caseSchema } from "./entities/case.entity";
import { userSchema } from "./entities/user.entity";
import { knowledgeSourceSchema } from "./entities/knowledge-source.entity";
import { CreateKnowledgeSourceCatalog1710000000013 } from "./migrations/1710000000013-CreateKnowledgeSourceCatalog";
import { AddKnowledgeRevisionsAndVectors1710000000014 } from "./migrations/1710000000014-AddKnowledgeRevisionsAndVectors";
import { ReplaceAgentQueueWithOutbox1710000000015 } from "./migrations/1710000000015-ReplaceAgentQueueWithOutbox";
import { AddJobDispatchAndTurnLocks1710000000016 } from "./migrations/1710000000016-AddJobDispatchAndTurnLocks";
import { AddNigeriaConsumerGuidance1710000000017 } from "./migrations/1710000000017-AddNigeriaConsumerGuidance";
import { AddKnowledgeSourceJurisdictions1710000000018 } from "./migrations/1710000000018-AddKnowledgeSourceJurisdictions";

export function createDataSource(database: PostgresConfig): DataSource {
  return new DataSource({
    type: "postgres",
    host: database.host,
    port: database.port,
    database: database.database,
    username: database.username,
    password: database.password,
    entities: [userSchema, caseSchema, caseMessageSchema, caseAttachmentSchema, knowledgeSourceSchema],
    migrations: [
      CreateUsers1710000000000,
      CreateBillingCases1710000000001,
      AddCaseIntakeState1710000000002,
      AddCaseMessageProcessingStatus1710000000003,
      AddAgentMessageSourcesAndActivities1710000000004,
      CreateAgentTurnJobs1710000000005,
      AddProvisionalCaseTitle1710000000006,
      AddCaseNextAction1710000000007,
      CreateCaseAttachments1710000000008,
      StoreCaseAttachmentsInCloudinary1710000000009,
      StageCaseAttachments1710000000010,
      AddDocumentReview1710000000011,
      AddMessageNextAction1710000000012,
      CreateKnowledgeSourceCatalog1710000000013,
      AddKnowledgeRevisionsAndVectors1710000000014,
      ReplaceAgentQueueWithOutbox1710000000015,
      AddJobDispatchAndTurnLocks1710000000016,
      AddNigeriaConsumerGuidance1710000000017,
      AddKnowledgeSourceJurisdictions1710000000018,
    ],
    synchronize: false,
  });
}
