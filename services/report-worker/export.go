package main

import (
	"context"
	"encoding/csv"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"
	"unicode"

	"github.com/jackc/pgx/v5"
	"github.com/redis/go-redis/v9"
)

var validReportID = regexp.MustCompile(`^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`)
var errRowLimit = errors.New("report exceeds row limit")

type reportFilters struct {
	Start        string `json:"start_date"`
	End          string `json:"end_date"`
	Currency     string `json:"currency"`
	Search       string `json:"search"`
	Status       string `json:"status"`
	Professional string `json:"professional"`
	Service      string `json:"service"`
	Payment      string `json:"payment"`
}

type reportJob struct {
	ID          string
	UserID      int64
	BusinessIDs []int64
	Filters     reportFilters
	Attempt     int
}

func (w *worker) handle(parent context.Context, message redis.XMessage) {
	id, ok := message.Values["report_id"].(string)
	if !ok || !validReportID.MatchString(id) {
		w.acknowledge(parent, message.ID)
		return
	}
	ctx, cancel := context.WithTimeout(parent, w.config.timeout)
	defer cancel()
	job := reportJob{ID: id}
	var businessJSON, filtersJSON []byte
	err := w.db.QueryRow(ctx, `UPDATE public.report_exports SET status='processing', attempts=attempts+1,
        rows_processed=0, error=NULL, updated_at=NOW()
        WHERE id=$1 AND expires_at>NOW() AND attempts<3
        AND (status='queued' OR (status='processing' AND updated_at < NOW()-INTERVAL '11 minutes'))
        RETURNING user_id,business_ids,filters,attempts`, id).Scan(&job.UserID, &businessJSON, &filtersJSON, &job.Attempt)
	if errors.Is(err, pgx.ErrNoRows) {
		// A reclaimed stream entry can precede the expiry of the DB heartbeat lease.
		// Keep active work pending, otherwise a late worker crash would lose its only delivery.
		var active bool
		checkErr := w.db.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM public.report_exports
            WHERE id=$1 AND status IN ('queued','processing') AND expires_at>NOW())`, id).Scan(&active)
		if checkErr == nil && !active {
			w.acknowledge(parent, message.ID)
		}
		return
	}
	if err != nil {
		slog.Warn("Cannot claim report", "report_id", id)
		return
	}
	err = json.Unmarshal(businessJSON, &job.BusinessIDs)
	if err == nil {
		err = json.Unmarshal(filtersJSON, &job.Filters)
	}
	if err == nil && len(job.BusinessIDs) == 0 {
		err = errors.New("empty business scope")
	}
	w.notify(ctx, job)
	var count int64
	if err == nil {
		count, err = w.export(ctx, job)
	}
	// A separate bounded context lets a cancelled job persist its retry state.
	finishCtx, finishCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer finishCancel()
	if err != nil {
		status, messageText := "queued", "El procesamiento se reintentará automáticamente."
		if job.Attempt >= 3 {
			status, messageText = "failed", "No se pudo generar el reporte después de tres intentos. Genera uno nuevo."
		}
		if errors.Is(err, errRowLimit) {
			status, messageText = "failed", "El reporte supera 1.000.000 de filas. Reduce el período o los filtros."
		}
		_, saveErr := w.db.Exec(finishCtx, `UPDATE public.report_exports SET status=$2,error=$3,updated_at=NOW()
            WHERE id=$1 AND attempts=$4 AND status='processing'`, id, status, messageText, job.Attempt)
		slog.Warn("Report attempt failed", "report_id", id, "attempt", job.Attempt, "error", err)
		if saveErr == nil && status == "failed" {
			w.acknowledge(finishCtx, message.ID)
		}
		w.notify(finishCtx, job)
		return
	}
	_, err = w.db.Exec(finishCtx, `UPDATE public.report_exports SET status='completed',rows_processed=$2,error=NULL,updated_at=NOW()
        WHERE id=$1 AND attempts=$3 AND status='processing'`, id, count, job.Attempt)
	if err != nil {
		slog.Warn("Cannot finalize report", "report_id", id)
		return
	}
	w.acknowledge(finishCtx, message.ID)
	w.notify(finishCtx, job)
}

// A single PostgreSQL statement streams a consistent result without loading all rows into memory.
// Every join is tenant-scoped, including payment aggregation and optional customer relations.
const reportQuery = `SELECT a.id::text,a.date::text,LEFT(a.start_time::text,5),
    COALESCE(c.name,'Cliente archivado'),COALESCE(c.phone,''),COALESCE(p.name,'Sin profesional'),
    COALESCE(s.name,'Servicio archivado'),a.status,a.currency,
    a.price::text,a.discount_amount::text,a.final_price::text,
    COALESCE(pay.total,0)::text,COALESCE(pay.methods,'Sin pago registrado'),COALESCE(br.name,b.name)
    FROM booking.appointments a
    JOIN business.businesses b ON b.id=a.business_id AND b.deleted_at IS NULL
    LEFT JOIN people.clients c ON c.id=a.client_id AND c.business_id=a.business_id AND c.deleted_at IS NULL
    LEFT JOIN people.professionals p ON p.id=a.professional_id AND p.business_id=a.business_id AND p.deleted_at IS NULL
    LEFT JOIN catalog.services s ON s.id=a.service_id AND s.business_id=a.business_id AND s.deleted_at IS NULL
    LEFT JOIN business.business_branches br ON br.id=a.branch_id AND br.business_id=a.business_id AND br.deleted_at IS NULL
    LEFT JOIN LATERAL (SELECT SUM(amount) total,STRING_AGG(DISTINCT method,', ' ORDER BY method) methods
        FROM finance.payments WHERE appointment_id=a.id AND business_id=a.business_id
        AND currency=a.currency AND status='COMPLETED') pay ON TRUE
    WHERE a.business_id=ANY($1::bigint[]) AND a.deleted_at IS NULL
    AND a.date BETWEEN $2::date AND $3::date AND a.currency=$4
    AND ($5='' OR a.status=$5)
    AND ($6='' OR COALESCE(p.name,'Sin profesional')=$6)
    AND ($7='' OR COALESCE(s.name,'Servicio archivado')=$7)
    AND ($8='' OR COALESCE(pay.methods,'Sin pago registrado')=$8)
    AND ($9='' OR STRPOS(LOWER(CONCAT_WS(' ',c.name,p.name,s.name)),LOWER($9))>0)
    ORDER BY a.date,a.start_time,a.id LIMIT $10`

func (w *worker) export(ctx context.Context, job reportJob) (int64, error) {
	temporary, err := os.CreateTemp(w.config.directory, job.ID+"-*.tmp")
	if err != nil {
		return 0, err
	}
	defer os.Remove(temporary.Name())
	defer temporary.Close()
	if err = temporary.Chmod(0640); err != nil {
		return 0, err
	}
	if _, err = temporary.WriteString("\xef\xbb\xbf"); err != nil {
		return 0, err
	}
	writer := csv.NewWriter(temporary)
	headers := []string{"ID", "Fecha", "Hora", "Cliente", "Teléfono", "Profesional", "Servicio", "Estado", "Moneda", "Valor servicio", "Descuento", "Valor final", "Pagos completados", "Método de pago", "Sucursal"}
	if err = writer.Write(headers); err != nil {
		return 0, err
	}
	f := job.Filters
	rows, err := w.db.Query(ctx, reportQuery, job.BusinessIDs, f.Start, f.End, f.Currency,
		f.Status, f.Professional, f.Service, f.Payment, f.Search, w.config.maxRows+1)
	if err != nil {
		return 0, err
	}
	defer rows.Close()
	var count int64
	for rows.Next() {
		count++
		if count > w.config.maxRows {
			return count, errRowLimit
		}
		record := make([]string, 15)
		if err = rows.Scan(&record[0], &record[1], &record[2], &record[3], &record[4], &record[5], &record[6], &record[7], &record[8], &record[9], &record[10], &record[11], &record[12], &record[13], &record[14]); err != nil {
			return count, err
		}
		for _, index := range []int{3, 4, 5, 6, 7, 8, 13, 14} {
			record[index] = safeCell(record[index])
		}
		if err = writer.Write(record); err != nil {
			return count, err
		}
		if count%1000 == 0 {
			writer.Flush()
			if err = writer.Error(); err != nil {
				return count, err
			}
			if _, err = w.db.Exec(ctx, `UPDATE public.report_exports SET rows_processed=$2,updated_at=NOW() WHERE id=$1 AND attempts=$3`, job.ID, count, job.Attempt); err != nil {
				return count, err
			}
		}
	}
	if err = rows.Err(); err != nil {
		return count, err
	}
	writer.Flush()
	if err = writer.Error(); err != nil {
		return count, err
	}
	if err = temporary.Sync(); err != nil {
		return count, err
	}
	if err = temporary.Close(); err != nil {
		return count, err
	}
	if err = os.Rename(temporary.Name(), filepath.Join(w.config.directory, job.ID+".csv")); err != nil {
		return count, err
	}
	return count, nil
}

func safeCell(value string) string {
	trimmed := strings.TrimLeftFunc(value, unicode.IsSpace)
	if trimmed != "" && strings.ContainsRune("=+-@", rune(trimmed[0])) {
		return "'" + value
	}
	if strings.ContainsAny(value, "\t\r\n") {
		return "'" + value
	}
	return value
}

func (w *worker) reconcile(ctx context.Context) {
	// Recover the database/Redis handoff if an API process exits between persistence and XADD.
	rows, err := w.db.Query(ctx, `SELECT id::text FROM public.report_exports WHERE status='queued'
        AND attempts=0 AND expires_at>NOW() AND updated_at<NOW()-INTERVAL '1 minute' LIMIT 100`)
	if err != nil {
		return
	}
	var ids []string
	for rows.Next() {
		var id string
		if rows.Scan(&id) == nil {
			ids = append(ids, id)
		}
	}
	rows.Close()
	for _, id := range ids {
		if err = w.redis.XAdd(ctx, &redis.XAddArgs{Stream: w.config.stream, Values: map[string]string{"report_id": id}}).Err(); err == nil {
			_, _ = w.db.Exec(ctx, `UPDATE public.report_exports SET updated_at=NOW() WHERE id=$1 AND status='queued'`, id)
		}
	}
	// No partial or expired export remains available indefinitely on the shared disk.
	entries, err := os.ReadDir(w.config.directory)
	if err == nil {
		for _, entry := range entries {
			if entry.IsDir() || (!strings.HasSuffix(entry.Name(), ".csv") && !strings.HasSuffix(entry.Name(), ".tmp")) {
				continue
			}
			info, statErr := entry.Info()
			if statErr == nil && time.Since(info.ModTime()) > 24*time.Hour {
				_ = os.Remove(filepath.Join(w.config.directory, entry.Name()))
			}
		}
	}
	_, _ = w.db.Exec(ctx, `UPDATE public.report_exports SET status='failed',error='La exportación venció. Genera una nueva.',updated_at=NOW()
        WHERE expires_at<NOW() AND status IN ('queued','processing')`)
	// A final crashed attempt must become terminal instead of occupying a slot forever.
	_, _ = w.db.Exec(ctx, `UPDATE public.report_exports SET status='failed',error='Se agotaron los reintentos. Genera una nueva exportación.',updated_at=NOW()
        WHERE status='processing' AND attempts>=3 AND updated_at<NOW()-INTERVAL '11 minutes'`)
}

func (job reportJob) channel() string {
	return fmt.Sprintf("private-user.%s", strconv.FormatInt(job.UserID, 10))
}
