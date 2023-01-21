export function BuildWebflowPostID(collectionID: string, postID: string): string {
  return `${collectionID}_${postID}`
}

export function BuildWebflowSiteID(wfSiteID: string, collectionID: string): string {
  return `${wfSiteID}_${collectionID}`
}

export function BuildWebflowPostSlug(collectionID: string, slug: string): string {
  return `${collectionID}_${slug}`
}

export function BreakdownWebflowPostID(dbPostID: string): { postID: string, collectionID: string } {
  const [collectionID, postID] = dbPostID.split("_")
  return {
    collectionID,
    postID
  }
}

export function BreakdownWebflowSlug(dbSlug: string): { slug: string, collectionID: string } {
  const [collectionID, slug] = dbSlug.split("_")
  return {
    collectionID,
    slug
  }
}

export function BreakdownWebflowSiteID(dbSiteID: string): { wfSiteID: string, collectionID: string } {
  const [wfSiteID, collectionID] = dbSiteID.split("_")
  return {
    collectionID,
    wfSiteID
  }
}
