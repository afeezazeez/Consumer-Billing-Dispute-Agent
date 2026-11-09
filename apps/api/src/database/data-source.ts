import { DataSource } from "typeorm";
import { CreateBillingCases1710000000001 } from "./migrations/1710000000001-CreateBillingCases";
import type { PostgresConfig } from "../config";
import { CreateUsers1710000000000 } from "./migrations/1710000000000-CreateUsers";
import { AddCaseIntakeState1710000000002 } from "./migrations/1710000000002-AddCaseIntakeState";
import { AddCaseMessageProcessingStatus1710000000003 } from "./migrations/1710000000003-AddCaseMessageProcessingStatus";
import { AddAgentMessageSourcesAndActivities1710000000004 } from "./migrations/1710000000004-AddAgentMessageSourcesAndActivities";
import { CreateAgentTurnJobs1710000000005 } from "./migrations/1710000000005-CreateAgentTurnJobs";
import { agentTurnJobSchema, caseMessageSchema, caseSchema } from "./entities/case.entity";
import { userSchema } from "./entities/user.entity";

export function createDataSource(database: PostgresConfig): DataSource {
  return new DataSource({
    type: "postgres",
    host: database.host,
    port: database.port,
    database: database.database,
    username: database.username,
    password: database.password,
    entities: [userSchema, caseSchema, caseMessageSchema, agentTurnJobSchema],
    migrations: [
      CreateUsers1710000000000,
      CreateBillingCases1710000000001,
      AddCaseIntakeState1710000000002,
      AddCaseMessageProcessingStatus1710000000003,
      AddAgentMessageSourcesAndActivities1710000000004,
      CreateAgentTurnJobs1710000000005,
    ],
    synchronize: false,
  });
}
