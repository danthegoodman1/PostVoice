import { basicInfoWithUserID } from "./base"

export interface WebflowSite extends basicInfoWithUserID {

}

export interface WebflowCMSItem extends basicInfoWithUserID {
  title: string
  b64_hash: string
  audio_path: string
}
