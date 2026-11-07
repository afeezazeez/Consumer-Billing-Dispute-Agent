import type { Request, Response } from "express";
import type { CaseService } from "./case.service";

export class CaseController {
  constructor(private readonly cases: CaseService) {}

  async list(request: Request, response: Response): Promise<void> {
    const userId = request.session.userId;
    if (!userId) return sendUnauthorized(response);
    response.status(200).json({ cases: await this.cases.listCases(userId) });
  }

  async create(request: Request, response: Response): Promise<void> {
    const userId = request.session.userId;
    if (!userId) return sendUnauthorized(response);
    const message = readOpeningMessage(request.body);
    if (!message) return sendInvalidMessage(response);
    const billingCase = await this.cases.createCase(userId, message);
    response.status(201).json({ case: billingCase });
  }

  async read(request: Request, response: Response): Promise<void> {
    const userId = request.session.userId;
    if (!userId) return sendUnauthorized(response);
    const caseId = request.params.caseId;
    if (typeof caseId !== "string") return sendCaseNotFound(response);
    const billingCase = await this.cases.findCase(userId, caseId);
    if (!billingCase) return sendCaseNotFound(response);
    response.status(200).json({ case: billingCase });
  }
}

function readOpeningMessage(body: unknown): string {
  if (typeof body !== "object" || body === null || !("openingMessage" in body)) return "";
  const message = body.openingMessage;
  return typeof message === "string" && message.trim().length <= 2000 ? message.trim() : "";
}

function sendUnauthorized(response: Response): void {
  response.status(401).json({ error: "not_authenticated" });
}

function sendInvalidMessage(response: Response): void {
  response.status(400).json({ error: "opening_message_required" });
}

function sendCaseNotFound(response: Response): void {
  response.status(404).json({ error: "case_not_found" });
}
