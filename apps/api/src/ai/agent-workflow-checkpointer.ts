import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import { Pool } from "pg";
import type { PostgresConfig } from "../config";

export function createAgentWorkflowCheckpointer(database: PostgresConfig) {
  const pool = new Pool({
    host: database.host,
    port: database.port,
    database: database.database,
    user: database.username,
    password: database.password,
  });
  const checkpointer = new PostgresSaver(pool);
  return {
    checkpointer,
    initialize: () => checkpointer.setup(),
    clearTurn: (caseId: string, messageId: string) => clearTurn(pool, caseId, messageId),
    close: () => pool.end(),
  };
}

async function clearTurn(pool: Pool, caseId: string, messageId: string): Promise<void> {
  const client = await pool.connect();
  try {
    await deleteTurnRows(client, caseId, `turn-${messageId}`);
  } finally {
    client.release();
  }
}

async function deleteTurnRows(client: import("pg").PoolClient, caseId: string, namespace: string): Promise<void> {
  await client.query("BEGIN");
  try {
    for (const table of ["checkpoint_writes", "checkpoint_blobs", "checkpoints"]) {
      await client.query(`DELETE FROM ${table} WHERE thread_id = $1 AND checkpoint_ns = $2`, [caseId, namespace]);
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}
