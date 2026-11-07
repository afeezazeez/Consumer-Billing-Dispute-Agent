import { plainToInstance } from "class-transformer";
import { validate, type ValidationError } from "class-validator";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import { ValidationException } from "../exceptions/validation.exception";

type DtoConstructor<T> = new () => T;

export function validateBody<T>(dtoClass: DtoConstructor<T>): RequestHandler {
  return async (request: Request, _response: Response, next: NextFunction) => {
    const dto = plainToInstance(dtoClass, request.body ?? {});
    const errors = await validate(dto as object);
    if (errors.length) return next(createValidationException(errors));
    request.body = dto;
    return next();
  };
}

function createValidationException(errors: ValidationError[]): ValidationException {
  const messages = errors.reduce<Record<string, string[]>>((result, error) => {
    if (error.constraints) result[error.property] = Object.values(error.constraints);
    return result;
  }, {});
  return new ValidationException(messages, firstValidationMessage(messages));
}

function firstValidationMessage(errors: Record<string, string[]>): string {
  return Object.values(errors)[0]?.[0] ?? "Invalid request format.";
}
