export interface basicInfo {
  id: string
  // Always there if getting from DB
  created_at?: Date
  // Always there if getting from DB
  updated_at?: Date
}

export interface basicInfoWithUserID extends basicInfo {
  user_id: string
}
