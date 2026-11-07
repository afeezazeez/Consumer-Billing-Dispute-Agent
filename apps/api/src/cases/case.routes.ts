import { Router } from "express";
import type { CaseController } from "./case.controller";

export function createCaseRouter(controller: CaseController): Router {
  const router = Router();
  router.get("/", (request, response) => controller.list(request, response));
  router.post("/", (request, response) => controller.create(request, response));
  router.get("/:caseId", (request, response) => controller.read(request, response));
  return router;
}
