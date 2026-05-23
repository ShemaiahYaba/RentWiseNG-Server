export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 500,
    public readonly data: unknown = null,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
