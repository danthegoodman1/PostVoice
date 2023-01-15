import { basicInfoWithUserID } from "./base";

export interface SynthesisJob extends basicInfoWithUserID {
  words: number
  ms: number
  /**
   * The job that was done, such as webflow/{site_id}/{slug} or ghost/{site_id}/{post_id}
   */
  job: string
}
