
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

  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  md5 TEXT NOT NULL,
  audio_path TEXT, -- null means it doesn't exist (yet)

  PRIMARY KEY(site_id, id)
)
;

CREATE INDEX webflow_cms_items_by_user ON webflow_cms_items(user_id);
CREATE INDEX webflow_cms_items_by_site_slug ON webflow_cms_items(site_id, slug);


-- +migrate Down
DROP TABLE users;
DROP TABLE webflow_sites;
DROP TABLE cms_items;
DROP TABLE cms_item_audio_part;
