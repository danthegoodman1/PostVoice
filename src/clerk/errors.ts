export class InvalidWebhookAuth extends Error {
  constructor () {
    super("invalid webhook auth")

    // capturing the stack trace keeps the reference to your error class
    Error.captureStackTrace(this, this.constructor);
  }
}
