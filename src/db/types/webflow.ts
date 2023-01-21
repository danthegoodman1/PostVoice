import { basicInfoWithUserID } from "./base";

export interface WebflowAccessToken extends basicInfoWithUserID {
  access_token: string
}
