import { Router } from "express";
import { sendSuccessResponse } from "../utils/http/response-handlers";

export const healthRouter = Router();

healthRouter.get("/", (_request, response) => {
  sendSuccessResponse(response, {
    status: "ok",
    service: "billing-agent-api",
  }, "Service is healthy");
});
