export class ErrorResponseDto<T> {
  success = false;
  message?: string;
  errors?: T;

  constructor(message?: string, errors?: T) {
    if (message) this.message = message;
    if (errors) this.errors = errors;
  }
}
