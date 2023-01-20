
-- +migrate Up
CREATE TABLE users (
  id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY(id)
)
;

CREATE TABLE sites (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  id TEXT NOT NULL,
  platform_id TEXT NOT NULL, -- the id on the platform, webflow is {site_id}_{collection_id}
  name TEXT NOT NULL,
  img_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  access_token TEXT NOT NULL,

  PRIMARY KEY(id)
)
;
CREATE INDEX sites_by_user ON sites(user_id);

CREATE TABLE site_posts (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  site_platform_id TEXT NOT NULL REFERENCES sites(platform_id) ON DELETE CASCADE, -- webflow is {collection_id}_{id}
  id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  title TEXT NOT NULL,
  slug TEXT NOT NULL, -- webflow is {collection_id}_{slug}
  md5 TEXT NOT NULL,
  audio_path TEXT NOT NULL,

  PRIMARY KEY(site_id, slug)
)
;

CREATE INDEX site_posts_by_user ON site_posts(user_id);
CREATE INDEX site_posts_by_id ON site_posts(site_id, id);


CREATE TABLE synthesis_jobs (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE DO NOTHING,
  id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  chars INT8 NOT NULL,
  ms INT8 NOT NULL,
  job TEXT NOT NULL, -- The job that was done, such as webflow_{our_site_id}_{our_slug}
  audio_path TEXT NOT NULL,

  PRIMARY KEY(user_id, id)
)
;


CREATE TABLE webflow_access_tokens (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE DO NOTHING,
  id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  access_token TEXT NOT NULL,

  PRIMARY KEY(user_id, id)
)

-- +migrate Down
DROP TABLE users;
DROP TABLE webflow_sites;
DROP TABLE webflow_cms_items;
DROP TABLE sites;
DROP TABLE site_posts;
DROP TABLE synthesis_jobs;
