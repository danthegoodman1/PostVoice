import { basicInfoWithUserID } from "./base";

export interface SynthesisJob extends basicInfoWithUserID {
  chars: number
  ms: number
  /**
   * The job that was done, such as webflow/{site_id}/{slug} or ghost/{site_id}/{post_id}
   */
  site_id: string
  post_slug: string
  audio_path: string
}
