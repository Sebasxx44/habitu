package main

import (
	"context"
	"encoding/csv"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

func TestWorkerProcessesScopedQueueAndRetries(t *testing.T) {
	databaseURL := os.Getenv("REPORT_WORKER_TEST_DATABASE_URL")
	if databaseURL == "" {
		t.Skip("isolated PostgreSQL and Redis required")
	}
	poolConfig, err := pgxpool.ParseConfig(databaseURL)
	if err != nil || poolConfig.ConnConfig.Database != "report_worker_test" {
		t.Fatal("refusing non-test database")
	}
	ctx := context.Background()
	db, err := pgxpool.NewWithConfig(ctx, poolConfig)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	if _, err = db.Exec(ctx, testSchema); err != nil {
		t.Fatal(err)
	}
	client := redis.NewClient(&redis.Options{Addr: os.Getenv("REPORT_WORKER_TEST_REDIS"), DB: 2})
	defer client.Close()
	w := worker{config: config{directory: t.TempDir(), stream: "test:reports", maxRows: 1000000, timeout: 10 * time.Minute}, db: db, redis: client}
	if err = client.XGroupCreateMkStream(ctx, w.config.stream, consumerGroup, "0").Err(); err != nil {
		t.Fatal(err)
	}
	id := "54eb25a1-1a8b-47e9-851c-1a94bd8f3d5c"
	filters := reportFilters{Start: "2026-10-01", End: "2026-10-03", Currency: "COP"}
	seedJob := func(jobID string, data reportFilters) {
		raw, _ := json.Marshal(data)
		if _, err = db.Exec(ctx, `INSERT INTO public.report_exports(id,user_id,business_ids,filters,status,attempts,rows_processed,expires_at,updated_at)
            VALUES($1,1,'[1]',$2,'queued',0,0,NOW()+INTERVAL '24 hours',NOW())`, jobID, raw); err != nil {
			t.Fatal(err)
		}
	}
	seedJob(id, filters)
	_, err = client.XAdd(ctx, &redis.XAddArgs{Stream: w.config.stream, Values: map[string]string{"report_id": id}}).Result()
	if err != nil {
		t.Fatal(err)
	}
	streams, err := client.XReadGroup(ctx, &redis.XReadGroupArgs{Group: consumerGroup, Consumer: "test", Streams: []string{w.config.stream, ">"}, Count: 1}).Result()
	if err != nil {
		t.Fatal(err)
	}
	w.handle(ctx, streams[0].Messages[0])
	var status string
	var count, attempts int
	if err = db.QueryRow(ctx, `SELECT status,rows_processed,attempts FROM public.report_exports WHERE id=$1`, id).Scan(&status, &count, &attempts); err != nil {
		t.Fatal(err)
	}
	if status != "completed" || count != 2 || attempts != 1 {
		t.Fatalf("unexpected job: %s rows=%d attempts=%d", status, count, attempts)
	}
	contents, err := os.ReadFile(filepath.Join(w.config.directory, id+".csv"))
	if err != nil {
		t.Fatal(err)
	}
	records, err := csv.NewReader(strings.NewReader(strings.TrimPrefix(string(contents), "\xef\xbb\xbf"))).ReadAll()
	if err != nil {
		t.Fatal(err)
	}
	if len(records) != 3 || records[1][3] != "'=1+1" || records[1][12] != "40.00" || records[2][12] != "0" {
		t.Fatalf("incorrect records: %#v", records)
	}
	pending, err := client.XPending(ctx, w.config.stream, consumerGroup).Result()
	if err != nil || pending.Count != 0 {
		t.Fatal("completed job not acknowledged")
	}
	w.handle(ctx, streams[0].Messages[0])
	if err = db.QueryRow(ctx, `SELECT attempts FROM public.report_exports WHERE id=$1`, id).Scan(&attempts); err != nil || attempts != 1 {
		t.Fatal("duplicate delivery processed twice")
	}

	failedID := "54eb25a1-1a8b-47e9-851c-1a94bd8f3d5d"
	filters.Start = "invalid-date"
	seedJob(failedID, filters)
	message := streams[0].Messages[0]
	message.Values["report_id"] = failedID
	for index := 0; index < 3; index++ {
		w.handle(ctx, message)
	}
	if err = db.QueryRow(ctx, `SELECT status,attempts FROM public.report_exports WHERE id=$1`, failedID).Scan(&status, &attempts); err != nil || status != "failed" || attempts != 3 {
		t.Fatal("failed job did not reach bounded retry limit")
	}
	if _, err = os.Stat(filepath.Join(w.config.directory, failedID+".csv")); !os.IsNotExist(err) {
		t.Fatal("failed report published a file")
	}

	activeID := "54eb25a1-1a8b-47e9-851c-1a94bd8f3d5e"
	filters.Start = "2026-10-01"
	seedJob(activeID, filters)
	if _, err = db.Exec(ctx, `UPDATE public.report_exports SET status='processing',attempts=1 WHERE id=$1`, activeID); err != nil {
		t.Fatal(err)
	}
	if _, err = client.XAdd(ctx, &redis.XAddArgs{Stream: w.config.stream, Values: map[string]string{"report_id": activeID}}).Result(); err != nil {
		t.Fatal(err)
	}
	activeStreams, err := client.XReadGroup(ctx, &redis.XReadGroupArgs{Group: consumerGroup, Consumer: "test", Streams: []string{w.config.stream, ">"}, Count: 1}).Result()
	if err != nil {
		t.Fatal(err)
	}
	w.handle(ctx, activeStreams[0].Messages[0])
	pending, err = client.XPending(ctx, w.config.stream, consumerGroup).Result()
	if err != nil || pending.Count != 1 {
		t.Fatal("active DB lease lost its queue delivery")
	}
	if _, err = db.Exec(ctx, `UPDATE public.report_exports SET updated_at=NOW()-INTERVAL '12 minutes' WHERE id=$1`, activeID); err != nil {
		t.Fatal(err)
	}
	w.handle(ctx, activeStreams[0].Messages[0])
	if err = db.QueryRow(ctx, `SELECT status,attempts FROM public.report_exports WHERE id=$1`, activeID).Scan(&status, &attempts); err != nil || status != "completed" || attempts != 2 {
		t.Fatal("stale lease was not recovered")
	}

	limitedID := "54eb25a1-1a8b-47e9-851c-1a94bd8f3d5f"
	seedJob(limitedID, filters)
	w.config.maxRows = 1
	message.Values["report_id"] = limitedID
	w.handle(ctx, message)
	if err = db.QueryRow(ctx, `SELECT status FROM public.report_exports WHERE id=$1`, limitedID).Scan(&status); err != nil || status != "failed" {
		t.Fatal("row limit did not fail explicitly")
	}
	if _, err = os.Stat(filepath.Join(w.config.directory, limitedID+".csv")); !os.IsNotExist(err) {
		t.Fatal("truncated report published as complete")
	}
}

const testSchema = `
CREATE SCHEMA booking; CREATE SCHEMA business; CREATE SCHEMA people; CREATE SCHEMA catalog; CREATE SCHEMA finance;
CREATE TABLE public.report_exports(id uuid PRIMARY KEY,user_id bigint,business_ids jsonb,filters jsonb,status text,attempts int,rows_processed bigint,error text,expires_at timestamptz,updated_at timestamptz);
CREATE TABLE business.businesses(id bigint PRIMARY KEY,name text,deleted_at timestamp);
CREATE TABLE business.business_branches(id bigint PRIMARY KEY,business_id bigint,name text,deleted_at timestamp);
CREATE TABLE people.clients(id bigint PRIMARY KEY,business_id bigint,name text,phone text,deleted_at timestamp);
CREATE TABLE people.professionals(id bigint PRIMARY KEY,business_id bigint,name text,deleted_at timestamp);
CREATE TABLE catalog.services(id bigint PRIMARY KEY,business_id bigint,name text,deleted_at timestamp);
CREATE TABLE booking.appointments(id bigint PRIMARY KEY,business_id bigint,branch_id bigint,client_id bigint,professional_id bigint,service_id bigint,date date,start_time time,status text,currency text,price numeric(10,2),discount_amount numeric(10,2),final_price numeric(10,2),deleted_at timestamp);
CREATE TABLE finance.payments(appointment_id bigint,business_id bigint,currency text,status text,amount numeric(10,2),method text);
INSERT INTO business.businesses VALUES(1,'Propio',NULL),(2,'Ajeno',NULL);
INSERT INTO business.business_branches VALUES(1,1,'Sede',NULL);
INSERT INTO people.clients VALUES(1,1,'=1+1','+573001234567',NULL),(2,2,'Otro','',NULL);
INSERT INTO people.professionals VALUES(1,1,'Ana',NULL);
INSERT INTO catalog.services VALUES(1,1,'Corte',NULL);
INSERT INTO booking.appointments VALUES
(1,1,1,1,1,1,'2026-10-03','10:00','COMPLETED','COP',120,20,100,NULL),
(2,1,1,1,1,1,'2026-10-03','11:00','PENDING','COP',50,0,50,NULL),
(3,2,1,2,1,1,'2026-10-03','10:00','COMPLETED','COP',999,0,999,NULL),
(4,1,1,1,1,1,'2026-10-03','10:00','COMPLETED','COP',999,0,999,NOW()),
(5,1,1,1,1,1,'2026-10-03','10:00','COMPLETED','USD',999,0,999,NULL);
INSERT INTO finance.payments VALUES(1,1,'COP','COMPLETED',40,'CARD'),(1,1,'COP','PENDING',60,'CASH'),(1,2,'COP','COMPLETED',999,'CARD');
`
