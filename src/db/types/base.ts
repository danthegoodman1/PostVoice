export interface basicInfo {
  id: string
  created_at: Date
  updated_at: Date
}

export interface basicInfoWithUserID extends basicInfo {
  user_id: string
}
