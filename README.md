# PostVoice

`openssl req -newkey rsa:2048 -new -nodes -x509 -days 3650 -keyout key.pem -out cert.pem`

`go install github.com/alash3al/tlx@latest`

`tlx -backend localhost:8080 -cert cert.pem -key key.pem -listen :8081`

## Framework rules

1. We never need write permissions/modify content, they always pull content
2. Have a low/no code option (embed)
3. Allow full customization (can reference audio file directly)
4. No feature-gating
5. Free tier

## Webflow

1. For listing the sites we can join the webflow site listing request on what we have in the DB
2. The urls for the embed or audio file direct should be `webflow/siteID/collectionID/slug`, and we can provide `siteID` and `collectionID` to them, and they inject the slug

## Ghost
1. Use post id directly like `ghost/siteID(ours)/postID`
