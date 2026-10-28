package main

import (
	"context"
	"crypto/hmac"
	"crypto/md5"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestRealtimeUsesSignedPrivatePusherEvent(t *testing.T) {
	called := false
	server := httptest.NewServer(http.HandlerFunc(func(response http.ResponseWriter, request *http.Request) {
		called = true
		body, err := io.ReadAll(request.Body)
		if err != nil {
			t.Error(err)
			return
		}
		query := request.URL.Query()
		signature := query.Get("auth_signature")
		query.Del("auth_signature")
		mac := hmac.New(sha256.New, []byte("test-secret"))
		mac.Write([]byte("POST\n/apps/test-app/events\n" + query.Encode()))
		expected := hex.EncodeToString(mac.Sum(nil))
		if signature != expected {
			t.Error("invalid Pusher signature")
		}
		checksum := md5.Sum(body)
		if query.Get("body_md5") != hex.EncodeToString(checksum[:]) {
			t.Error("invalid body checksum")
		}
		var payload struct {
			Name     string   `json:"name"`
			Channels []string `json:"channels"`
			Data     string   `json:"data"`
		}
		if err = json.Unmarshal(body, &payload); err != nil {
			t.Error(err)
			return
		}
		if payload.Name != "resource.changed" || len(payload.Channels) != 1 || payload.Channels[0] != "private-user.42" || !strings.Contains(payload.Data, `"topics":["reports"]`) {
			t.Error("incorrect event or private recipient")
		}
		response.WriteHeader(http.StatusOK)
	}))
	defer server.Close()
	host, port, err := net.SplitHostPort(strings.TrimPrefix(server.URL, "http://"))
	if err != nil {
		t.Fatal(err)
	}
	w := worker{config: config{pusherID: "test-app", pusherKey: "test-key", pusherSecret: "test-secret", pusherHost: host, pusherPort: port, pusherScheme: "http"}}
	w.notify(context.Background(), reportJob{ID: "54eb25a1-1a8b-47e9-851c-1a94bd8f3d5c", UserID: 42})
	if !called {
		t.Fatal("Pusher endpoint not called")
	}
}
