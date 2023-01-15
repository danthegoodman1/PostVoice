
-- +migrate Up
CREATE TABLE users (
  id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY(id)
)
;

CREATE TABLE webflow_sites (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  access_token TEXT NOT NULL,

  PRIMARY KEY(id)
)
;

CREATE INDEX webflow_sites_by_user ON webflow_sites(user_id);

CREATE TABLE webflow_cms_items (
  user_id TEXT NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  site_id TEXT NOT NULL REFERENCES webflow_sites(id)  ON DELETE CASCADE,
  id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  collection_id TEXT NOT NULL,

  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  md5 TEXT NOT NULL,
  audio_path TEXT NOT NULL,

  PRIMARY KEY(site_id, collection_id, slug)
)
;

CREATE INDEX webflow_cms_items_by_user ON webflow_cms_items(user_id);
CREATE INDEX webflow_cms_items_by_id ON webflow_cms_items(site_id, collection_id, id);

CREATE TABLE synthesis_jobs (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  chars INT8 NOT NULL,
  ms INT8 NOT NULL,
  job TEXT NOT NULL, -- The job that was done, such as webflow/{site_id}/{slug} or ghost/{site_id}/{post_id}
  audio_path TEXT NOT NULL,

  PRIMARY KEY(user_id, id)
)
;


-- +migrate Down
DROP TABLE users;
DROP TABLE webflow_sites;
DROP TABLE cms_items;
DROP TABLE cms_item_audio_part;
