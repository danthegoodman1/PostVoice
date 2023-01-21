export function BuildWebflowPostID(collectionID: string, postID: string): string {
  return `${collectionID}_${postID}`
}

export function BuildWebflowSiteID(wfSiteID: string, collectionID: string): string {
  return `${wfSiteID}_${collectionID}`
}

export function BuildWebflowPostSlug(collectionID: string, slug: string): string {
  return `${collectionID}_${slug}`
}
