
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

  PRIMARY KEY(user_id, id)
)
;

CREATE TABLE cms_items (
  user_id TEXT NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  platform_id TEXT NOT NULL, -- the id within the platform
  platform_title TEXT NOT NULL, -- a recognizable title or slug of the CMS item
  hash_sum TEXT NOT NULL, -- b64 encoded content hash excluding our iframe
  audio_path TEXT, -- null means it doesn't exist (yet)

  platform TEXT NOT NULL, -- webflow, ghost

  PRIMARY KEY(id)
)
;

CREATE INDEX cms_items_by_user ON cms_items(user_id, platform);

CREATE TABLE cms_item_audio_part (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  item_id TEXT NOT NULL REFERENCES cms_items(id) ON DELETE CASCADE,
  content TEXT NOT NULL,

  PRIMARY KEY(user_id, item_id, id)
)
;


-- +migrate Down
DROP TABLE users;
DROP TABLE webflow_sites;
DROP TABLE cms_items;
DROP TABLE cms_item_audio_part;
