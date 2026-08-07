# Gaming Project Progress

This document tracks the progress of the gaming project, including milestones, current status, and upcoming tasks.

## Tasks
- [ ] Task 1
- [ ] Task 2

- [ ] 執行 qa 驗證，確認 auto-todo.ts 能成功產生 5-1、5-2、5-3、5-4 等待辦項目並正確寫入 todowrite
- [ ] 在專案根目錄建立 .opencode 目錄並新增 auto-todo.ts 檔案，實作讀取 docs/gaming-project-progress.md 並將未完成項目寫入 todowrite
- [ ] 在 package.json 中新增 prestart 腳本，於啟動伺服器前執行 .opencode/auto-todo.ts
- [ ] 在 Docker Compose 的 entrypoint 或 CMD 裡加入 .opencode/auto-todo.ts 的執行，使容器啟動時自動產生待辦清單
