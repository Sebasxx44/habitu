package main

import (
	"net"
	"os"
	"strconv"
	"time"
)

type config struct {
	databaseURL, redisAddress, redisPassword, stream, directory, consumer   string
	redisDB                                                                 int
	maxRows                                                                 int64
	timeout                                                                 time.Duration
	pusherID, pusherKey, pusherSecret, pusherHost, pusherScheme, pusherPort string
}

func environment(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func loadConfig() config {
	host, _ := os.Hostname()
	redisDB, _ := strconv.Atoi(environment("REPORT_REDIS_DB", "2"))
	return config{
		databaseURL:   os.Getenv("DATABASE_URL"),
		redisAddress:  net.JoinHostPort(environment("REPORT_REDIS_HOST", "redis"), environment("REPORT_REDIS_PORT", "6379")),
		redisPassword: os.Getenv("REPORT_REDIS_PASSWORD"), redisDB: redisDB,
		stream: environment("REPORT_STREAM", "habitu:reports"), directory: environment("REPORT_DIRECTORY", "/reports"),
		consumer: host + "-" + strconv.Itoa(os.Getpid()), maxRows: 1000000, timeout: 10 * time.Minute,
		pusherID: os.Getenv("PUSHER_APP_ID"), pusherKey: os.Getenv("PUSHER_APP_KEY"), pusherSecret: os.Getenv("PUSHER_APP_SECRET"),
		pusherHost: environment("PUSHER_HOST", "soketi"), pusherScheme: environment("PUSHER_SCHEME", "http"), pusherPort: environment("PUSHER_PORT", "6001"),
	}
}
