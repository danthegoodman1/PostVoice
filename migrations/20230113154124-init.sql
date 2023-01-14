
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
  id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  title TEXT NOT NULL, -- a recognizable title or slug of the CMS item
  b64_hash TEXT NOT NULL, -- b64 encoded content hash excluding our iframe
  audio_path TEXT, -- null means it doesn't exist (yet)

  PRIMARY KEY(id)
)
;

CREATE INDEX webflow_cms_items_by_user ON webflow_cms_items(user_id, platform);

CREATE TABLE cms_item_audio_part (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  item_id TEXT NOT NULL REFERENCES cms_items(id) ON DELETE CASCADE,
  seq INT8 NOT NULL, -- [0,n) in order
  content TEXT NOT NULL,
  audio_path TEXT NOT NULL,

  PRIMARY KEY(item_id, seq)
)
;


-- +migrate Down
DROP TABLE users;
DROP TABLE webflow_sites;
DROP TABLE cms_items;
DROP TABLE cms_item_audio_part;
