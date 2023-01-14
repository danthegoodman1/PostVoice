import { basicInfoWithUserID } from "./base"

export interface CMSItemAudioPart extends basicInfoWithUserID {
  item_id: string
  seq: number
  content: string
  audio_path: string
}
