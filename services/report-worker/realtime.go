package main

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/md5"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"io"
	"log/slog"
	"net"
	"net/http"
	"net/url"
	"strconv"
	"time"
)

// Pusher's HTTP signature requires body_md5 and an HMAC-SHA256 request signature.
func (w *worker) notify(ctx context.Context, job reportJob) {
	c := w.config
	if c.pusherID == "" || c.pusherSecret == "" || c.pusherKey == "" {
		return
	}
	payload, _ := json.Marshal(struct {
		Topics     []string `json:"topics"`
		Revision   string   `json:"revision"`
		OccurredAt string   `json:"occurred_at"`
	}{[]string{"reports"}, job.ID + "-" + strconv.FormatInt(time.Now().UnixNano(), 10), time.Now().UTC().Format(time.RFC3339)})
	body, _ := json.Marshal(struct {
		Name     string   `json:"name"`
		Channels []string `json:"channels"`
		Data     string   `json:"data"`
	}{"resource.changed", []string{job.channel()}, string(payload)})
	path := "/apps/" + url.PathEscape(c.pusherID) + "/events"
	sum := md5.Sum(body)
	query := url.Values{"auth_key": {c.pusherKey}, "auth_timestamp": {strconv.FormatInt(time.Now().Unix(), 10)}, "auth_version": {"1.0"}, "body_md5": {hex.EncodeToString(sum[:])}}
	signature := hmac.New(sha256.New, []byte(c.pusherSecret))
	signature.Write([]byte("POST\n" + path + "\n" + query.Encode()))
	query.Set("auth_signature", hex.EncodeToString(signature.Sum(nil)))
	endpoint := c.pusherScheme + "://" + net.JoinHostPort(c.pusherHost, c.pusherPort) + path + "?" + query.Encode()
	request, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(body))
	if err != nil {
		return
	}
	request.Header.Set("Content-Type", "application/json")
	response, err := (&http.Client{Timeout: 3 * time.Second}).Do(request)
	if err != nil {
		slog.Warn("Report realtime unavailable; status remains queryable", "report_id", job.ID)
		return
	}
	defer response.Body.Close()
	_, _ = io.Copy(io.Discard, io.LimitReader(response.Body, 1024))
	if response.StatusCode >= 300 {
		slog.Warn("Report realtime rejected", "status", response.StatusCode)
	}
}
