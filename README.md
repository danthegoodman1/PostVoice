# PostVoice

`openssl req -newkey rsa:2048 -new -nodes -x509 -days 3650 -keyout key.pem -out cert.pem`

`go install github.com/alash3al/tlx@latest`

`tlx -backend localhost:8080 -cert cert.pem -key key.pem -listen :8081`
