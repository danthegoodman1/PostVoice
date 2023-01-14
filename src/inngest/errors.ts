// class CMSPartTooLong extends Error {
//   constructor(message: string) {
//     super(message)

//     // assign the error class name in your custom error (as a shortcut)
//     this.name = this.constructor.name

//     // capturing the stack trace keeps the reference to your error class
//     Error.captureStackTrace(this, this.constructor);

//     // you may also assign additional properties to your error
//     this.isSleepy = true
//   }
// }

export class CMSPartTooLong extends Error {
  constructor() {
    super("cms part too long")

    // assign the error class name in your custom error (as a shortcut)
    this.name = this.constructor.name

    // capturing the stack trace keeps the reference to your error class
    Error.captureStackTrace(this, this.constructor);
  }
}

export class CMSItemChangedDuringProcessing extends Error {
  constructor() {
    super("cms part changed during processing")

    // assign the error class name in your custom error (as a shortcut)
    this.name = this.constructor.name

    // capturing the stack trace keeps the reference to your error class
    Error.captureStackTrace(this, this.constructor);
  }
}
