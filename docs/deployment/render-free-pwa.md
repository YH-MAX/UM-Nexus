# UM Nexus：自有域名 + Render 免费托管

## 当前方案

- `apps/web`：Next.js 网页与 PWA，Render **Free Web Service**。
- `apps/api`：沿用现有 FastAPI 服务，Render **Free Web Service**。
- 数据库、登录、商品图片：沿用现有 Supabase 项目，商品图片放 `listing-images` Storage bucket。
- 原生 App 和 Spring Boot 迁移暂缓。
- 还没有购买域名时，先使用 Render 分配的 HTTPS 地址测试；域名购买后再绑定。

仓库中的 `render.yaml` 描述两个免费服务，不包含已购买域名或真实密钥。**修改文件不会自动创建、升级或发布线上服务。**

## 免费方案的实际边界

核对日期：2026-10-31。以 [Render Free 文档](https://render.com/docs/free) 和账号 Billing 页面为准。

- 闲置 15 分钟后休眠，唤醒约需一分钟；前后端可能分别唤醒。
- 同一 workspace 每月共享 750 个免费运行小时。两个实例同时运行每小时消耗两个实例小时；若都持续运行，约 375 小时就会用完。额度耗尽会暂停免费服务至下月。
- 流量和构建分钟也有额度。已绑定支付方式时，部分超额用量可能收费；在 Billing 检查额度和可用的 spend limit，不能把 `plan: free` 理解成所有使用均无费用。
- 不用定时请求保活，这会持续消耗共享额度。可订阅平台部署/故障通知，避免高频外部探测把服务长期唤醒。
- 免费服务重启、休眠、重新部署会丢失本地写入的文件，持久数据必须放现有 Supabase。不要把生产图片存在容器 `/uploads`，也不要把本地 SQLite 当生产库。
- 不新建 Render 免费 Postgres：该产品存在到期限制。本方案继续使用已有数据库。
- 免费配置保留 `CELERY_TASK_ALWAYS_EAGER=true`，任务在 API 内执行，不创建收费 worker、cron 或 Redis。AI 任务可能占用请求处理时间；扩大使用前再评估独立任务队列。

这些限制意味着目前是可公开访问的试用部署，不能保证全天候稳定在线。

## 1. 将已验证的改动发布到 GitHub

先在 `apps/web` 执行：

```powershell
npm run lint
npm run build
npm run test:pwa
```

检查并提交本次 PWA 文件、`public/` 图标与断网页、Dockerfile、`render.yaml` 和本文档，然后推送到 Render 使用的分支。不要提交 `.env` / `.env.local`。仓库还有其他进行中的移动端和后端修改，应审查后再决定是否包含。

## 2. 沿用现有 API，只创建前端服务

如果 `um-nexus-api` 已存在，优先在 Dashboard 保留这个服务及其数据库配置，不要因为创建 Blueprint 再建一个重复 API。

在 Render 选择 **New → Web Service**，连接 GitHub 仓库 `YH-MAX/UM-Nexus` 和包含本次修改的分支，填写：

| 设置 | 值 |
|---|---|
| Name | `um-nexus-pwa`，如有冲突以实际名称为准 |
| Language / Runtime | Docker |
| Root Directory | 留空，从仓库根目录解析下面的路径 |
| Dockerfile Path | `apps/web/Dockerfile` |
| Docker Build Context Directory | `apps/web` |
| Instance Type | **Free** |
| Region | 新服务可选 Singapore；现有 API 不为此强制迁区 |
| Health Check Path | `/manifest.webmanifest` |
| Auto Deploy | Off，先手动发布通过验收的版本 |

也可以使用根目录 `render.yaml` 创建完整 Blueprint，但先确认计划中是否会创建重复的 API。Blueprint 未指定 region 时新服务使用平台默认区域；需要 Singapore 可在创建前为新服务添加 `region: singapore`，不要修改既有服务的区域。

## 3. 填写前端环境变量

| 名称 | 值 |
|---|---|
| `APP_ENV` | `production` |
| `PORT` | `3000` |
| `NEXT_PUBLIC_SUPABASE_URL` | 现有 Supabase 项目 URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | 同一项目的 publishable key 或 anon key |
| `NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS` | `siswa.um.edu.my` |
| `NEXT_PUBLIC_API_BASE_URL` | 现有 API 的 HTTPS 地址，加 `/api/v1`；当前本地配置为 `https://um-nexus-api.onrender.com/api/v1`，发布前确认服务地址仍有效 |
| `NEXT_PUBLIC_API_TIMEOUT_MS` | `90000`，给免费 API 冷启动留时间，不会自动重试发布等写操作 |
| `NEXT_PUBLIC_E2E_AUTH` | `false` |
| `SKIP_ENV_VALIDATION` | `false` |

从本机 `apps/web/.env.local` 复制对应的公开 Supabase 值到 Render 的 Environment，不需要在聊天里发送密钥。**前端不能配置 `SUPABASE_SERVICE_ROLE_KEY`、数据库密码或 Z.AI API key。**

Render 会把 Docker 服务环境变量提供为构建参数，Dockerfile 显式接收构建所需的公开变量。Next.js 会在构建时固化 `NEXT_PUBLIC_*`，更改后必须重新构建部署。

服务启动命令会监听 `0.0.0.0` 和 Render 的 `PORT`，没有提供时使用 3000。容器包含 `public/`，确保 `/sw.js`、离线页和图标在线上可访问。

点击 Deploy，记录平台**实际分配**的 HTTPS 地址，不要假设它一定与服务名称完全一致。

## 4. 更新现有 API 与 Supabase

在现有 API 服务保留当前 `DATABASE_URL`、`SUPABASE_*`、存储和 AI 设置；数据库 URL 必须是服务端可访问的真实数据库连接，不能是本机 `localhost` / Docker `postgres`。

将前端实际 HTTPS origin 追加到 API 的 `CORS_ALLOWED_ORIGINS`：

```env
CORS_ALLOWED_ORIGINS=https://你的实际前端.onrender.com
```

有多个允许地址时用英文逗号分隔，origin 不带 `/trade` 等路径，也不带末尾斜杠。不要直接覆盖仍在使用的正式域名。

API 健康检查改为 `/health/ready`，部署时除进程启动外还检查数据库连接。这个现有端点的 storage 检查只验证本地目录存在，**不代表 Supabase bucket 的上传权限已验证**；需实际上传图片验收。现有 API Docker 启动时运行 `alembic upgrade head`，先备份数据库，再部署 API。免费服务不使用收费的 pre-deploy command。

在 **Supabase → Authentication → URL Configuration**：

- Site URL：设置为当前前端 HTTPS 地址。
- Redirect URLs：添加前端 HTTPS 地址和 `<前端HTTPS地址>/auth/callback`。
- 保留实际仍在使用的开发回调地址，邮箱验证保持开启。

重新部署 API，确认 `/health/ready` 返回 HTTP 200，然后测试前端登录、商品加载及图片上传。

## 5. 买域名后再绑定

域名需要单独购买，当前没有选定或注册任何域名。不要把示例域名当成已拥有的域名。

节省域名配额的做法：先仅给**前端**绑定主域名，API 继续使用已有 `onrender.com` 地址。Render 的 Hobby workspace 包含的自定义域名数量有限；主域名会自动增加对应的 `www` 重定向域名，添加 API 子域名前先确认配额与费用。

1. 在前端服务 **Settings → Custom Domains** 添加已购买域名。
2. 到域名 DNS 控制台，按 Render 对这个域名给出的记录配置；不要复制猜测的 IP 或指向本机局域网地址。只修改用于本网站的 DNS 记录，保留邮箱等无关记录。
3. 回到 Render 验证 DNS，等待 HTTPS 证书签发。Render 自动签发及续期证书。
4. 把自有域名 HTTPS origin 追加到 API CORS 并重新部署 API。
5. 把 Supabase Site URL 改成主域名，Redirect URLs 添加主域名和 `/auth/callback`。
6. 以后统一从自有域名安装 PWA。临时域名安装的 PWA 不会自动迁到自有域名；从旧域名卸载后，在新域名重新安装，可能需要重新登录。

## 6. 手机验收与后续维护

- 分别使用 Wi-Fi 和移动数据打开自有域名，电脑关机时仍可访问。
- 浏览器 `/` 保留 landing page；Android Chrome 安装应用、iPhone Safari 添加到主屏幕后，从图标启动应直接进入 `/trade`。
- 测试 UM 邮箱验证、登录退出、浏览、收藏、发布、图片上传和私密联系权限。
- 检查断网提示和恢复重试；交易操作需要网络，PWA 不缓存账户页或 API 响应。
- 闲置后再打开，确认可等待免费服务唤醒；这不是安装失败。
- 查看 Render Logs、部署结果和 Billing 用量。部署/故障通知发给账号所有者。
- 在现有数据库服务确认备份能力、保留周期并实际演练恢复；不要假定免费数据库已有自动备份。数据库导出与商品图片备份分别保存。
- 更新前记下当前可用 commit 和部署版本。出问题可回滚应用版本，但应用回滚不会撤销数据库迁移；涉及迁移时先检查兼容性及备份。

## 参考

- [Render Free 额度与休眠](https://render.com/docs/free)
- [Render Blueprint 字段](https://render.com/docs/blueprint-spec)
- [Render Docker 构建](https://render.com/docs/docker)
- [Render 自定义域名与证书](https://render.com/docs/custom-domains)
- [Supabase 登录重定向](https://supabase.com/docs/guides/auth/redirect-urls)
