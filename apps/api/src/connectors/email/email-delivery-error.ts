export type EmailDeliveryCertainty = "not_sent" | "rejected" | "unknown";

export class EmailDeliveryError extends Error {
  constructor(
    message: string,
    readonly certainty: EmailDeliveryCertainty,
    readonly providerCode: string,
    readonly statusCode?: number,
  ) {
    super(message);
    this.name = "EmailDeliveryError";
  }
}
