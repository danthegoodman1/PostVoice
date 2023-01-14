import { basicInfoWithUserID } from "./base"

export interface WebflowSite extends basicInfoWithUserID {

}

export interface WebflowCMSItem extends basicInfoWithUserID {
  title: string
  md5: string
  audio_path: string
}
