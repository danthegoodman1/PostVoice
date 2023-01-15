import { basicInfoWithUserID } from "./base";

export interface SynthesisJob extends basicInfoWithUserID {
  words: number
  seconds: number
}
