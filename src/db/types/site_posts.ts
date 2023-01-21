import { basicInfoWithUserID } from "./base"

export interface SitePost extends basicInfoWithUserID {
  site_id: string
  site_platform_id: string | null
  title: string
  slug: string
  md5: string
  audio_path: string
}
