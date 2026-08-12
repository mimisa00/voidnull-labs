# VoidNull Platform — 維運操作手冊

> **對象**：負責交接後維運的管理員（重啟服務、看 Log、處理告警、資料庫備份還原、擴容）  
> **技術棧**：NestJS / Next.js / PostgreSQL / Redis / Socket.io / Turborepo / Docker Compose  
> **監控**：Prometheus + Grafana / ELK Stack  
> **版本**：1.0 | 2025-07

---

## 目錄

1. [架構概覽](#1-架構概覽)
2. [環境說明](#2-環境說明)
3. [快速啟動](#3-快速啟動)
4. [日常服務操作](#4-日常服務操作)
5. [查看 Log](#5-查看-log)
6. [資料庫操作](#6-資料庫操作)
7. [監控：Prometheus + Grafana](#7-監控prometheus--grafana)
8. [監控：ELK Stack](#8-監控elk-stack)
9. [處理常見告警](#9-處理常見告警)
10. [擴容](#10-擴容)
11. [Let's Encrypt 憑證管理](#11-lets-encrypt-憑證管理)
12. [緊急處置程序](#12-緊急處置程序)
13. [Secret & 環境變數管理](#13-secret--環境變數管理)

---

## 1. 架構概覽

```
Internet
    │
    ▼
 Nginx (80/443)
    │
    ├──► Web (Next.js :3000) ─── 前端 SSR + 靜態資源
    │
    ├──► API (NestJS :3001)  ─── REST API + WebSocket (Socket.io)
    │        │
    │        ├──► PostgreSQL :5432  (主資料庫)
    │        └──► Redis :6379       (Token 黑名單 / Cache)
    │
    └── Monitoring
             ├── Prometheus :9090
             ├── Grafana :3100
             ├── Elasticsearch :9200
             ├── Logstash :5000/5044
             └── Kibana :5601
```

### 容器清單

| 容器名稱 | Image | 用途 |
|---------|-------|------|
| postgres | postgres:16-alpine | 主資料庫 |
| redis | redis:7-alpine | Cache / Token 管理 |
| api | voidnull/api | NestJS 後端 |
| web | voidnull/web | Next.js 前端 |
| nginx | nginx:alpine | Reverse Proxy + SSL |
| certbot | certbot/certbot | Let's Encrypt 自動續約 |

---

## 2. 環境說明

| 環境 | Compose 文件 | Domain | 分支 |
|------|-------------|--------|------|
| Dev (本機) | `infra/docker/compose.dev.yml` | localhost | develop |
| Staging | `infra/docker/compose.staging.yml` | staging.voidnull.io | staging |
| Production | `infra/docker/compose.prod.yml` | voidnull.io / voidnull.ai | main |

### 環境變數檔位置（伺服器上）

```
/opt/voidnull/
├── .env              # 當前環境的 secrets（不進 git）
├── infra/
│   ├── docker/
│   └── nginx/
└── docs/
```

---

## 3. 快速啟動

### 3.1 本機 Dev 環境（第一次）

```bash
# 1. 進入專案根目錄
cd /c/gitlab/voidnull

# 2. 複製環境變數檔
cp .env.example .env

# 3. 啟動所有服務（包含 migrate + seed）
docker compose -f infra/docker/compose.dev.yml up -d

# 4. 等待服務就緒（約 30-60 秒）
docker compose -f infra/docker/compose.dev.yml ps

# 5. 確認服務正常
curl http://localhost:3001/api/health     # API 健康檢查
# 開啟瀏覽器：http://localhost:3000       # 前端

# 6. 測試登入
# Email: admin@voidnull.io
# Password: Admin@123456
```

### 3.2 Production 伺服器啟動

```bash
# SSH 進入伺服器
ssh admin@voidnull.io

cd /opt/voidnull

# 啟動（僅第一次需要 --build）
docker compose -f infra/docker/compose.prod.yml up -d

# 確認所有容器都 healthy
docker compose -f infra/docker/compose.prod.yml ps
```

---

## 4. 日常服務操作

> **注意**：以下指令在伺服器上執行，需先 `cd /opt/voidnull`

### 4.1 重啟服務

```bash
# ── 重啟特定服務 ──────────────────────────────────────────────────
# 重啟 API（最常用）
docker compose -f infra/docker/compose.prod.yml restart api

# 重啟 Web
docker compose -f infra/docker/compose.prod.yml restart web

# 重啟 Nginx（套用新設定後）
docker compose -f infra/docker/compose.prod.yml exec nginx nginx -s reload
# 或完整重啟
docker compose -f infra/docker/compose.prod.yml restart nginx

# 重啟資料庫（謹慎！會短暫中斷連線）
docker compose -f infra/docker/compose.prod.yml restart postgres

# ── 重啟全部服務 ───────────────────────────────────────────────────
docker compose -f infra/docker/compose.prod.yml restart

# ── 停止 / 啟動 ────────────────────────────────────────────────────
docker compose -f infra/docker/compose.prod.yml stop
docker compose -f infra/docker/compose.prod.yml start

# ── 完全重建（部署新版本時）────────────────────────────────────────
docker compose -f infra/docker/compose.prod.yml up -d --no-deps api web
```

### 4.2 確認服務狀態

```bash
# 所有容器狀態
docker compose -f infra/docker/compose.prod.yml ps

# 資源使用情況
docker stats --no-stream

# API 健康檢查
curl -s http://localhost:3001/api/health | jq

# 資料庫連線測試
docker compose -f infra/docker/compose.prod.yml exec postgres \
    psql -U $POSTGRES_USER -c "SELECT 1;"

# Redis 連線測試
docker compose -f infra/docker/compose.prod.yml exec redis \
    redis-cli ping
```

### 4.3 進入容器 Shell

```bash
# 進入 API 容器
docker compose -f infra/docker/compose.prod.yml exec api sh

# 進入資料庫
docker compose -f infra/docker/compose.prod.yml exec postgres \
    psql -U $POSTGRES_USER -d $POSTGRES_DB

# 進入 Redis CLI
docker compose -f infra/docker/compose.prod.yml exec redis redis-cli
```

---

## 5. 查看 Log

### 5.1 即時 Log

```bash
# ── 所有服務 ───────────────────────────────────────────────────────
docker compose -f infra/docker/compose.prod.yml logs -f

# ── 特定服務 ───────────────────────────────────────────────────────
docker compose -f infra/docker/compose.prod.yml logs -f api
docker compose -f infra/docker/compose.prod.yml logs -f web
docker compose -f infra/docker/compose.prod.yml logs -f nginx
docker compose -f infra/docker/compose.prod.yml logs -f postgres

# ── 最近 N 行 ──────────────────────────────────────────────────────
docker compose -f infra/docker/compose.prod.yml logs --tail=100 api

# ── 搜尋特定關鍵字 ────────────────────────────────────────────────
docker compose -f infra/docker/compose.prod.yml logs api | grep "ERROR"
docker compose -f infra/docker/compose.prod.yml logs nginx | grep "502\|503\|504"

# ── 特定時間段 ────────────────────────────────────────────────────
docker compose -f infra/docker/compose.prod.yml logs --since="2025-07-15T10:00:00" api
docker compose -f infra/docker/compose.prod.yml logs --since="1h" api    # 最近 1 小時
```

### 5.2 Log 格式說明

**NestJS API Log:**
```
[NestJS] 2025-07-15 10:30:00  LOG [AuthController] POST /api/auth/login - 200 - 45ms
[NestJS] 2025-07-15 10:30:01 ERROR [AuthService] Invalid credentials for user@example.com
```

**Nginx Access Log:**
```
192.168.1.1 - - [15/Jul/2025:10:30:00 +0000] "GET /api/users HTTP/1.1" 200 1234 "-" "Mozilla/5.0..."
```

**關注的 HTTP 狀態碼：**
- `401` — 未授權（JWT 過期或無效）
- `403` — 無權限（RBAC 拒絕）
- `429` — Rate limit 被觸發
- `500` — API 內部錯誤 → 立即查 api log
- `502/503/504` — Nginx 無法連到上游 → API 或 Web 掛了

---

## 6. 資料庫操作

### 6.1 備份

```bash
# ── 手動完整備份 ────────────────────────────────────────────────────
BACKUP_DIR="/opt/backups/postgres"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_NAME="${POSTGRES_DB:-voidnull_prod}"

mkdir -p $BACKUP_DIR

docker compose -f infra/docker/compose.prod.yml exec -T postgres \
    pg_dump -U $POSTGRES_USER -d $DB_NAME --no-password \
    | gzip > "$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.sql.gz"

echo "Backup saved: $BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.sql.gz"

# ── 驗證備份 ────────────────────────────────────────────────────────
gzip -t "$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.sql.gz" && echo "OK" || echo "CORRUPTED"
ls -lh $BACKUP_DIR/

# ── 自動備份（加到 crontab）────────────────────────────────────────
# crontab -e
# 0 2 * * * /opt/voidnull/scripts/backup-db.sh >> /var/log/db-backup.log 2>&1
```

### 6.2 還原

```bash
# ⚠️  還原前先確認：
# 1. 告知所有用戶服務暫停
# 2. 備份現有資料
# 3. 停止 API（避免寫入衝突）

docker compose -f infra/docker/compose.prod.yml stop api

BACKUP_FILE="/opt/backups/postgres/voidnull_prod_20250715_020000.sql.gz"
DB_NAME="${POSTGRES_DB:-voidnull_prod}"

# 刪除並重建資料庫
docker compose -f infra/docker/compose.prod.yml exec -T postgres \
    psql -U $POSTGRES_USER -c "DROP DATABASE IF EXISTS ${DB_NAME};"
docker compose -f infra/docker/compose.prod.yml exec -T postgres \
    psql -U $POSTGRES_USER -c "CREATE DATABASE ${DB_NAME};"

# 還原
gunzip -c $BACKUP_FILE | docker compose -f infra/docker/compose.prod.yml exec -T postgres \
    psql -U $POSTGRES_USER -d $DB_NAME

# 重啟 API
docker compose -f infra/docker/compose.prod.yml start api

echo "Restore complete. Verify data integrity."
```

### 6.3 資料庫 Migration

```bash
# 部署時執行（CI/CD 已自動化，手動執行如下）
docker compose -f infra/docker/compose.prod.yml run --rm api \
    sh -c "cd /app && npx prisma migrate deploy"

# 查看 migration 狀態
docker compose -f infra/docker/compose.prod.yml run --rm api \
    sh -c "cd /app && npx prisma migrate status"

# ⚠️  生產環境禁用 `prisma migrate dev`（會刪除資料）
# 只用 `prisma migrate deploy`
```

### 6.4 常用 SQL 查詢

```bash
# 進入 psql
docker compose -f infra/docker/compose.prod.yml exec postgres \
    psql -U $POSTGRES_USER -d $POSTGRES_DB
```

```sql
-- 查看所有用戶
SELECT id, email, username, is_active, is_2fa_enabled, created_at FROM users ORDER BY created_at DESC;

-- 查看用戶角色
SELECT u.email, r.name as role FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id;

-- 查看有效 Refresh Token 數量
SELECT COUNT(*) FROM refresh_tokens WHERE is_revoked = false AND expires_at > NOW();

-- 撤銷某用戶所有 Token（強制下線）
UPDATE refresh_tokens SET is_revoked = true WHERE user_id = '<user_uuid>';

-- 查看最近 Audit Log
SELECT action, resource, ip_address, created_at FROM audit_logs ORDER BY created_at DESC LIMIT 50;

-- 查看大表大小
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables WHERE schemaname = 'public' ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- 查看慢查詢（需開啟 pg_stat_statements）
SELECT query, calls, mean_exec_time, total_exec_time
FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 20;
```

### 6.5 Redis 操作

```bash
# 進入 Redis CLI
docker compose -f infra/docker/compose.prod.yml exec redis redis-cli

# 常用指令
PING                           # 確認連線
INFO memory                    # 記憶體使用
INFO keyspace                  # Key 統計
DBSIZE                         # Key 總數
KEYS blacklist:*               # 查看 Token 黑名單
TTL blacklist:<token>          # 查看 Token 剩餘 TTL
DEL blacklist:<token>          # 手動移除黑名單
FLUSHDB                        # ⚠️ 清空所有 Key（謹慎！會讓所有黑名單失效）
```

---

## 7. 監控：Prometheus + Grafana

### 7.1 啟動監控服務

```bash
cd /opt/voidnull

# 監控服務獨立於主服務，單獨啟動
docker compose -f monitoring/docker-compose.monitoring.yml up -d

# 確認運行
docker compose -f monitoring/docker-compose.monitoring.yml ps
```

### 7.2 存取介面

| 介面 | URL | 帳密 |
|------|-----|------|
| Prometheus | http://server-ip:9090 | 無（需設防火牆限制） |
| Grafana | http://server-ip:3100 | admin / (GRAFANA_PASSWORD) |
| Kibana | http://server-ip:5601 | 無（需設防火牆限制） |

> **安全提醒**：監控介面不應暴露到公網，只允許 VPN 或 SSH Tunnel 存取

### 7.3 Grafana Dashboard 設定

1. 登入 Grafana → 左側 "+" → Import Dashboard
2. 匯入常用 Dashboard ID：
   - **Node Exporter Full**: `1860`（Host 系統指標）
   - **PostgreSQL Database**: `9628`
   - **Redis Dashboard**: `11835`
   - **Nginx**: `9614`
3. 資料來源選 `Prometheus`

### 7.4 關鍵指標說明

| 指標 | PromQL | 告警閾值 |
|------|--------|---------|
| CPU 使用率 | `100 - (avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)` | > 80% |
| 記憶體使用 | `(node_memory_MemTotal - node_memory_MemAvailable) / node_memory_MemTotal * 100` | > 85% |
| 磁碟使用 | `100 - (node_filesystem_avail_bytes / node_filesystem_size_bytes * 100)` | > 80% |
| API 5xx 錯誤率 | `rate(http_requests_total{status=~"5.."}[5m])` | > 1% |
| PostgreSQL 連線數 | `pg_stat_activity_count` | > 80 |
| Redis 記憶體 | `redis_memory_used_bytes / redis_memory_max_bytes * 100` | > 80% |

### 7.5 設定 Grafana 告警

1. 選擇 Dashboard → 點選 Panel → Edit
2. Alert → Create alert rule
3. 設定條件（Threshold）
4. Notification Channel → 填入 Email 或 Slack Webhook

---

## 8. 監控：ELK Stack

### 8.1 Kibana 基本操作

1. 開啟 http://server-ip:5601
2. 左側 Menu → Discover
3. 建立 Index Pattern：`voidnull-logs-*`，時間欄位選 `@timestamp`
4. 點 "Create index pattern" 完成

### 8.2 常用 KQL 查詢（Kibana Query Language）

```
# 查看所有 ERROR
level: "error"

# 查看特定用戶的操作
email: "user@example.com"

# 查看 API 401/403
http_status: (401 OR 403)

# 查看慢請求（超過 1 秒）
response_time > 1000

# 查看特定 IP 的請求
remote_ip: "1.2.3.4"

# 組合查詢：今天的錯誤
level: "error" AND @timestamp >= now-1d/d
```

### 8.3 查看 Log 在 Kibana 中

1. Discover → 選 index pattern `voidnull-logs-*`
2. 右上角選時間範圍（Last 15 minutes / Last 1 hour）
3. 搜尋欄輸入 KQL 查詢
4. 左側可加欄位篩選

---

## 9. 處理常見告警

### 🔴 API 服務無回應 / 502 錯誤

```bash
# 1. 確認 API 容器狀態
docker compose -f infra/docker/compose.prod.yml ps api

# 2. 查看最後 50 行 log
docker compose -f infra/docker/compose.prod.yml logs --tail=50 api

# 3. 若 container exited，查看退出原因
docker inspect voidnull-prod-api-1 | grep -A5 "State"

# 4. 重啟
docker compose -f infra/docker/compose.prod.yml restart api

# 5. 若反覆 crash，可能是資料庫連線失敗
docker compose -f infra/docker/compose.prod.yml logs postgres
```

### 🔴 資料庫連線失敗

```bash
# 1. 確認 postgres 容器
docker compose -f infra/docker/compose.prod.yml ps postgres

# 2. 查看 postgres log
docker compose -f infra/docker/compose.prod.yml logs postgres | tail -30

# 3. 嘗試手動連線
docker compose -f infra/docker/compose.prod.yml exec postgres pg_isready

# 4. 若磁碟滿了（常見原因）
df -h
du -sh /var/lib/docker/volumes/voidnull-prod_postgres_data

# 5. 清除舊的 WAL log（謹慎）
docker compose -f infra/docker/compose.prod.yml exec postgres \
    vacuumdb -U $POSTGRES_USER -z -d $POSTGRES_DB
```

### 🔴 記憶體不足 / OOM

```bash
# 查看記憶體使用
free -h
docker stats --no-stream

# 找記憶體佔用最多的容器
docker stats --no-stream --format "table {{.Name}}\t{{.MemUsage}}" | sort -k2 -h

# 重啟記憶體洩漏的服務（臨時解決）
docker compose -f infra/docker/compose.prod.yml restart api

# 清除 Docker 系統資源
docker system prune -f  # 移除停止的容器、未使用的 image
```

### 🔴 磁碟空間不足

```bash
# 檢查磁碟使用
df -h
du -sh /var/lib/docker/volumes/*

# 清除舊 Docker image
docker image prune -a --filter "until=720h"  # 30 天前的 image

# 清除舊 log（Docker log 預設無上限）
# 設定 log rotation 到 /etc/docker/daemon.json
# {"log-driver": "json-file", "log-opts": {"max-size": "100m", "max-file": "3"}}

# 清除舊備份
ls -lht /opt/backups/postgres/
# 刪除 7 天前的備份
find /opt/backups/postgres -name "*.gz" -mtime +7 -delete
```

### 🟡 Redis 記憶體過高

```bash
# 查看 Redis 記憶體
docker compose -f infra/docker/compose.prod.yml exec redis redis-cli INFO memory

# 查看最大記憶體設定
docker compose -f infra/docker/compose.prod.yml exec redis redis-cli CONFIG GET maxmemory

# 手動清除過期 key（Redis 本身會自動清，但可手動觸發）
docker compose -f infra/docker/compose.prod.yml exec redis redis-cli DEBUG SLEEP 0

# 查看大 key（找異常大的 key）
docker compose -f infra/docker/compose.prod.yml exec redis redis-cli \
    --bigkeys --no-auth-warning
```

### 🟡 Nginx 返回 504 Gateway Timeout

```bash
# 通常是 API 回應太慢
# 1. 查看 API 的慢日誌
docker compose -f infra/docker/compose.prod.yml logs api | grep -i "timeout\|slow\|warn"

# 2. 查看 PostgreSQL 慢查詢
docker compose -f infra/docker/compose.prod.yml exec postgres \
    psql -U $POSTGRES_USER -c "SELECT pid, query, state, query_start FROM pg_stat_activity WHERE state != 'idle' ORDER BY query_start;"

# 3. 查看是否有鎖等待
docker compose -f infra/docker/compose.prod.yml exec postgres \
    psql -U $POSTGRES_USER -c "SELECT * FROM pg_locks WHERE NOT granted;"

# 4. 必要時終止長查詢
# SELECT pg_terminate_backend(<pid>);
```

---

## 10. 擴容

### 10.1 垂直擴容（升級機器規格）

```bash
# 在 AWS/GCP 上：升級 instance type
# 1. 停止服務（或使用 Load Balancer 先切流量）
# 2. 更改 instance type
# 3. 重啟機器
# 4. 重啟服務

docker compose -f infra/docker/compose.prod.yml up -d
```

### 10.2 水平擴容（增加 API/Web 實例）

```bash
# 方法一：在同一台機器增加 replica（需 Load Balancer 前置）
docker compose -f infra/docker/compose.prod.yml up -d --scale api=3 --scale web=2

# 確認所有 replica 都在運行
docker compose -f infra/docker/compose.prod.yml ps

# 方法二：新增一台機器，部署完整 stack，在 Load Balancer 加入
# (AWS: 加入 Target Group, GCP: 加入 Backend Service)
```

> **注意**：水平擴容 API 時，多個 API 實例共用同一個 Redis，Socket.io 需要確認使用 Redis Adapter（`@socket.io/redis-adapter`），否則 WebSocket 連線可能無法跨實例廣播。

### 10.3 PostgreSQL 擴容

```bash
# 選項一：升級同一台 PostgreSQL 的資源
# 選項二：建立 Read Replica（AWS RDS / GCP Cloud SQL）

# 使用 Read Replica 時，在 .env 加入：
# DATABASE_URL_REPLICA=postgresql://user:pass@replica-host:5432/db
# 在 NestJS 使用 PrismaClient 設定 replica

# 開啟 PostgreSQL connection pooling（推薦 PgBouncer）
docker run -d --name pgbouncer \
    -e DATABASE_URL=$DATABASE_URL \
    -e POOL_SIZE=25 \
    edoburu/pgbouncer
```

---

## 11. Let's Encrypt 憑證管理

### 11.1 初次申請憑證

```bash
cd /opt/voidnull

# Staging 環境
bash infra/certbot/init-letsencrypt.sh staging

# Production 環境（先用 --staging flag 測試，確認後去掉 flag 重跑）
bash infra/certbot/init-letsencrypt.sh prod
```

### 11.2 確認憑證狀態

```bash
# 查看憑證到期時間
docker compose -f infra/docker/compose.prod.yml run --rm certbot certificates

# 查看憑證文件
ls -la infra/docker/certbot/conf/live/
```

### 11.3 手動更新憑證

```bash
# 手動觸發更新（certbot 容器每 12 小時自動執行，這是手動版）
docker compose -f infra/docker/compose.prod.yml run --rm certbot renew

# 更新後 reload Nginx
docker compose -f infra/docker/compose.prod.yml exec nginx nginx -s reload
```

### 11.4 憑證到期問題排查

```bash
# 確認 port 80 可從外部訪問（Let's Encrypt ACME challenge 需要）
curl http://voidnull.io/.well-known/acme-challenge/test

# 確認 DNS 指向正確 IP
dig voidnull.io
dig voidnull.ai

# 查看 certbot log
docker compose -f infra/docker/compose.prod.yml logs certbot
```

---

## 12. 緊急處置程序

### 🚨 完整服務中斷

```bash
# 立即確認
docker compose -f infra/docker/compose.prod.yml ps

# 嘗試重啟所有服務
docker compose -f infra/docker/compose.prod.yml up -d

# 若 compose 文件有問題，檢查語法
docker compose -f infra/docker/compose.prod.yml config

# 最後手段：重新拉取並啟動
docker compose -f infra/docker/compose.prod.yml pull
docker compose -f infra/docker/compose.prod.yml down
docker compose -f infra/docker/compose.prod.yml up -d
```

### 🚨 資料遺失 / 誤操作

```bash
# 立即停止 API（防止更多寫入）
docker compose -f infra/docker/compose.prod.yml stop api

# 從最新備份還原
# (參考第 6.2 節還原步驟)

# PostgreSQL 如果剛誤刪，嘗試 PITR（需 WAL archiving 設定）
# 如果沒有設定，只能從定期備份還原
```

### 🚨 資安事件（懷疑被入侵）

```bash
# 1. 立即撤銷所有 Refresh Token
docker compose -f infra/docker/compose.prod.yml exec postgres \
    psql -U $POSTGRES_USER -d $POSTGRES_DB \
    -c "UPDATE refresh_tokens SET is_revoked = true;"

# 2. 更換所有 JWT Secrets（需重啟 API）
# 編輯 .env 文件，更換 JWT_SECRET / JWT_REFRESH_SECRET / JWT_2FA_SECRET
nano /opt/voidnull/.env

# 3. 重啟 API（使舊 Token 全部失效）
docker compose -f infra/docker/compose.prod.yml restart api

# 4. 查看 Audit Log 找異常操作
docker compose -f infra/docker/compose.prod.yml exec postgres \
    psql -U $POSTGRES_USER -d $POSTGRES_DB \
    -c "SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100;"

# 5. 查看 Nginx log 找異常 IP
docker compose -f infra/docker/compose.prod.yml logs nginx | grep " 20[0-9] " | \
    awk '{print $1}' | sort | uniq -c | sort -rn | head -20
```

---

## 13. Secret & 環境變數管理

### 13.1 .env 文件內容

```bash
# 生產環境的 .env 在伺服器上：/opt/voidnull/.env
# 不進 git，不放 .env 在 repo 裡

# 產生安全隨機 Secret
openssl rand -base64 32    # JWT_SECRET
openssl rand -base64 32    # JWT_REFRESH_SECRET
openssl rand -base64 32    # JWT_2FA_SECRET
```

### 13.2 AWS Secrets Manager（若用 AWS）

```bash
# 取得 Secret
aws secretsmanager get-secret-value \
    --secret-id voidnull/prod/env \
    --query SecretString --output text > /opt/voidnull/.env

# 更新 Secret
aws secretsmanager update-secret \
    --secret-id voidnull/prod/env \
    --secret-string file:///opt/voidnull/.env
```

### 13.3 GCP Secret Manager（若用 GCP）

```bash
# 取得 Secret
gcloud secrets versions access latest --secret="voidnull-prod-env" > /opt/voidnull/.env

# 更新 Secret
gcloud secrets versions add voidnull-prod-env --data-file=/opt/voidnull/.env
```

---

## 附錄：快速指令彙整表

| 操作 | 指令 |
|------|------|
| 重啟 API | `docker compose -f infra/docker/compose.prod.yml restart api` |
| 查看 API log | `docker compose -f infra/docker/compose.prod.yml logs -f api` |
| 查看所有服務狀態 | `docker compose -f infra/docker/compose.prod.yml ps` |
| 進入 DB | `docker compose -f infra/docker/compose.prod.yml exec postgres psql -U $POSTGRES_USER -d $POSTGRES_DB` |
| 備份資料庫 | `./scripts/backup-db.sh` |
| Reload Nginx | `docker compose -f infra/docker/compose.prod.yml exec nginx nginx -s reload` |
| 查看磁碟 | `df -h && docker system df` |
| 查看記憶體 | `free -h && docker stats --no-stream` |
| 撤銷所有 Token | `UPDATE refresh_tokens SET is_revoked = true;` |
| 更新憑證 | `docker compose -f infra/docker/compose.prod.yml run --rm certbot renew` |

---

*手冊版本：1.0 — 隨原始碼交接後依實際環境更新*
