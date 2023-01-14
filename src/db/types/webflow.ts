import { basicInfoWithUserID } from "./base"

export interface WebflowSite extends basicInfoWithUserID {
  access_token: string
}

export interface WebflowCMSItem extends basicInfoWithUserID {
  title: string
  md5: string
  audio_path: string
  site_id: string
  slug: string
}
