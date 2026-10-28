FROM golang:1.24-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /report-worker .

FROM alpine:3.22
RUN apk add --no-cache ca-certificates \
    && (grep -q '^www-data:' /etc/group || addgroup -g 82 -S www-data) \
    && (id -u www-data >/dev/null 2>&1 || adduser -u 82 -S -G www-data www-data) \
    && mkdir /reports && chown www-data:www-data /reports
COPY --from=build /report-worker /usr/local/bin/report-worker
USER www-data
ENTRYPOINT ["report-worker"]
