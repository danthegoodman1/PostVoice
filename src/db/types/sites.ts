import { basicInfoWithUserID } from "./base"

export interface Site extends basicInfoWithUserID {
  kind: SiteKind
  platform_id: string | null
  name: string
  img_url: string | null
  access_token: string | null
}

export type SiteKind = "webflow" | "custom"
