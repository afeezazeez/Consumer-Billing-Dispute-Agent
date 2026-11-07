export class SuccessResponseDto<T> {
  success = true;
  message?: string;
  data?: T;

  constructor(message?: string, data?: T) {
    if (message) this.message = message;
    this.data = data;
  }
}
