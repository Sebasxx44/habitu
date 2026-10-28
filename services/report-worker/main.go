package main

import (
	"context"
	"errors"
	"log/slog"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

const consumerGroup = "report-workers"

type worker struct {
	config config
	db     *pgxpool.Pool
	redis  *redis.Client
}

func main() {
	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer cancel()
	cfg := loadConfig()
	if cfg.databaseURL == "" && os.Getenv("PGHOST") == "" {
		slog.Error("DATABASE_URL or PostgreSQL PGHOST configuration is required")
		os.Exit(1)
	}
	poolConfig, err := pgxpool.ParseConfig(cfg.databaseURL)
	if err != nil {
		slog.Error("Invalid database configuration")
		os.Exit(1)
	}
	poolConfig.MaxConns = 3
	poolConfig.ConnConfig.RuntimeParams["timezone"] = "UTC"
	db, err := pgxpool.NewWithConfig(ctx, poolConfig)
	if err != nil {
		slog.Error("Cannot initialize database")
		os.Exit(1)
	}
	defer db.Close()
	client := redis.NewClient(&redis.Options{Addr: cfg.redisAddress, Password: cfg.redisPassword, DB: cfg.redisDB})
	defer client.Close()
	if err = os.MkdirAll(cfg.directory, 0750); err != nil {
		slog.Error("Cannot create report directory", "error", err)
		os.Exit(1)
	}
	w := worker{config: cfg, db: db, redis: client}
	if err = w.run(ctx); err != nil && !errors.Is(err, context.Canceled) {
		slog.Error("Worker stopped", "error", err)
		os.Exit(1)
	}
}

func (w *worker) run(ctx context.Context) error {
	maintenance := time.Time{}
	claimCursor := "0-0"
	for ctx.Err() == nil {
		err := w.redis.XGroupCreateMkStream(ctx, w.config.stream, consumerGroup, "0").Err()
		if err != nil && !strings.Contains(err.Error(), "BUSYGROUP") {
			slog.Warn("Report queue unavailable")
			if !pause(ctx, 5*time.Second) {
				break
			}
			continue
		}
		if time.Since(maintenance) > time.Minute {
			w.reconcile(ctx)
			maintenance = time.Now()
		}
		// Reclaim after the maximum job duration; a healthy running job cannot be stolen.
		messages, nextCursor, err := w.redis.XAutoClaim(ctx, &redis.XAutoClaimArgs{
			Stream: w.config.stream, Group: consumerGroup, Consumer: w.config.consumer,
			MinIdle: w.config.timeout + time.Minute, Start: claimCursor, Count: 1,
		}).Result()
		if err == nil {
			claimCursor = nextCursor
		}
		if err == nil && len(messages) > 0 {
			w.handle(ctx, messages[0])
			continue
		}
		streams, err := w.redis.XReadGroup(ctx, &redis.XReadGroupArgs{
			Group: consumerGroup, Consumer: w.config.consumer, Streams: []string{w.config.stream, ">"},
			Count: 1, Block: 5 * time.Second,
		}).Result()
		if errors.Is(err, redis.Nil) {
			continue
		}
		if err != nil {
			if !pause(ctx, 2*time.Second) {
				break
			}
			continue
		}
		for _, stream := range streams {
			for _, message := range stream.Messages {
				w.handle(ctx, message)
			}
		}
	}
	return ctx.Err()
}

func (w *worker) acknowledge(ctx context.Context, messageID string) {
	pipe := w.redis.TxPipeline()
	pipe.XAck(ctx, w.config.stream, consumerGroup, messageID)
	pipe.XDel(ctx, w.config.stream, messageID)
	if _, err := pipe.Exec(ctx); err != nil {
		slog.Warn("Report acknowledgement will be retried")
	}
}

func pause(ctx context.Context, duration time.Duration) bool {
	timer := time.NewTimer(duration)
	defer timer.Stop()
	select {
	case <-ctx.Done():
		return false
	case <-timer.C:
		return true
	}
}
