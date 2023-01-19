import { basicInfoWithUserID } from "./base"

export interface Site extends basicInfoWithUserID {
  kind: string
  platform_id: string
  name: string
  img_url: string | null
  access_token: string
}
