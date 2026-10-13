# ============================================================
#  给用户重置密码（忘记密码用）
#
#  为什么需要这个：本项目不发邮件，Supabase 免费档的
#  「Send password recovery」发不出去，所以只能管理员人工改。
#  改密码走 Auth Admin API —— 你给【新的明文密码】，
#  服务器自己算 bcrypt 哈希覆盖旧的，全程不碰哈希、也不需要原密码。
#
#  用法（在本文件所在目录开 PowerShell）：
#     .\reset-password.ps1
#         然后按提示输入：管理员密钥 → 用户邮箱 → 新密码
#
#     .\reset-password.ps1 -Email user@qq.com -NewPassword 'abc123456'
#         一行搞定，不用交互
#
#  ⚠️ 管理员密钥（sb_secret_... / service_role）是【万能钥匙】：
#     能改任何人的密码、能读所有数据、能删账号。
#     【绝对不能】写进 App 代码里，也不能提交到 git。
#     本脚本只会把它存在项目【外面】：
#         C:\Users\<你的用户名>\.jack-admin\supabase-secret.txt
#     —— 放项目里的话，万一哪天被打包进 APK 就完了。
# ============================================================

[CmdletBinding()]
param(
    [string]$Email,
    [string]$NewPassword,
    [string]$SecretKey,
    [switch]$ForgetKey
)

$ErrorActionPreference = 'Stop'

# ---------- 小工具 ----------
function Say($msg, $color = 'Gray') { Write-Host $msg -ForegroundColor $color }
function Ok($msg)   { Write-Host "  [OK] $msg"   -ForegroundColor Green }
function Bad($msg)  { Write-Host "  [!!] $msg"   -ForegroundColor Red }
function Step($msg) { Write-Host "`n$msg" -ForegroundColor Cyan }

# ---------- 找项目地址 ----------
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$authJs = Join-Path (Split-Path -Parent $here) 'utils\auth.js'
if (-not (Test-Path $authJs)) {
    Bad "找不到 $authJs"
    Say '  这个脚本要放在项目的 supabase\ 目录下才认得项目地址。'
    exit 1
}
$src = Get-Content $authJs -Raw -Encoding UTF8
$SupabaseUrl = [regex]::Match($src, "SUPABASE_URL\s*=\s*'([^']+)'").Groups[1].Value
if (-not $SupabaseUrl) { Bad '从 utils/auth.js 里读不到 SUPABASE_URL'; exit 1 }

Say ''
Say '============================================'
Say '  给用户重置密码'
Say '============================================'
Say "  项目: $SupabaseUrl"

# ---------- 拿管理员密钥 ----------
$secretDir  = Join-Path $env:USERPROFILE '.jack-admin'
$secretFile = Join-Path $secretDir 'supabase-secret.txt'

if ($ForgetKey -and (Test-Path $secretFile)) {
    Remove-Item $secretFile -Force
    Say '  已忘掉本机保存的密钥。'
}

if (-not $SecretKey -and (Test-Path $secretFile)) {
    $SecretKey = (Get-Content $secretFile -Raw -Encoding UTF8).Trim()
    if ($SecretKey) { Say '  已用本机保存的密钥。' }
}

if (-not $SecretKey) {
    Step '第 1 步：管理员密钥'
    Say '  去哪拿：Supabase Dashboard → Project Settings → API Keys'
    Say '  要的是 secret 那把（sb_secret_... 或 legacy 的 service_role），'
    Say '  不是 anon / publishable 那把 —— 那把是给 App 用的，权限不够。'
    Say ''
    $secure = Read-Host '  粘贴密钥（输入时不显示）' -AsSecureString
    $SecretKey = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    )
    $SecretKey = $SecretKey.Trim()
    if (-not $SecretKey) { Bad '没输入密钥，退出。'; exit 1 }

    $ans = Read-Host '  要存在本机吗？下次就不用再输了（存到用户目录，项目外面）[Y/n]'
    if ($ans -eq '' -or $ans -match '^[Yy]') {
        if (-not (Test-Path $secretDir)) { New-Item -ItemType Directory -Path $secretDir -Force | Out-Null }
        [System.IO.File]::WriteAllText($secretFile, $SecretKey, (New-Object System.Text.UTF8Encoding($false)))
        Ok "已保存到 $secretFile"
        Say '     （想删掉就再跑一次加 -ForgetKey）'
    }
}

$adminHeaders = @{
    apikey        = $SecretKey
    Authorization = "Bearer $SecretKey"
}

# ---------- 找用户 ----------
if (-not $Email) {
    Step '第 2 步：要改哪个账号'
    $Email = (Read-Host '  用户邮箱').Trim()
}
if (-not $Email) { Bad '没输入邮箱，退出。'; exit 1 }

Step "第 3 步：在服务器上找 $Email"

$found = $null
$page = 1
while ($true) {
    $listUrl = "$SupabaseUrl/auth/v1/admin/users?page=$page&per_page=200"
    try {
        # -UserAgent 不能省：PowerShell 默认 UA 是 "Mozilla/5.0 ... WindowsPowerShell/..."
        # Supabase 会当成浏览器拒掉 secret 密钥（只报一句 401，看不出原因）
        $resp = Invoke-RestMethod -Uri $listUrl -Headers $adminHeaders -UserAgent 'jack-admin-local/1.0' -TimeoutSec 40
    } catch {
        Bad "查询用户失败：$($_.Exception.Message)"
        if ("$($_.Exception.Message)" -match '401|403|Invalid API key|JWT') {
            Say '  密钥不对或权限不够 —— 要用 secret / service_role 那把。'
            Say '  换密钥：删掉 %USERPROFILE%\.jack-admin\supabase-secret.txt，或加 -ForgetKey 再跑。'
        }
        exit 1
    }

    $users = @($resp.users)
    if ($users.Count -eq 0) { break }

    $hit = $users | Where-Object { $_.email -and $_.email.ToLower() -eq $Email.ToLower() }
    if ($hit) { $found = $hit; break }

    if ($users.Count -lt 200) { break }
    $page++
    if ($page -gt 50) { break }
}

if (-not $found) {
    Bad "服务器上没有这个邮箱的账号：$Email"
    Say '  可能原因：邮箱拼错了 / 这个邮箱还没注册过。'
    Say '  想看看都有谁：Supabase Dashboard → Authentication → Users'
    exit 1
}

Ok "找到了：$($found.email)"
Say "     账号 ID : $($found.id)"
Say "     注册于  : $($found.created_at)"
if ($found.last_sign_in_at) { Say "     上次登录: $($found.last_sign_in_at)" }

# ---------- 设新密码 ----------
if (-not $NewPassword) {
    Step '第 4 步：设新密码'
    Say '  至少 6 位（Supabase 默认要求）。'
    Say '  注意：这个密码你要通过微信告诉用户，别记错。'
    $p1 = Read-Host '  新密码'
    $p2 = Read-Host '  再输一遍'
    if ($p1 -ne $p2) { Bad '两次输入不一样，退出。'; exit 1 }
    $NewPassword = $p1
}
if ($NewPassword.Length -lt 6) { Bad '密码少于 6 位，Supabase 会拒。'; exit 1 }

Step '第 5 步：提交'
$body = @{ password = $NewPassword } | ConvertTo-Json
try {
    $null = Invoke-RestMethod -Uri "$SupabaseUrl/auth/v1/admin/users/$($found.id)" `
        -Method Put -Headers $adminHeaders -ContentType 'application/json' `
        -UserAgent 'jack-admin-local/1.0' `
        -Body $body -TimeoutSec 40
    Ok '密码已改好。'
} catch {
    $detail = ''
    try {
        $sr = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $detail = $sr.ReadToEnd()
    } catch { }
    Bad "改密码失败：$($_.Exception.Message)"
    if ($detail) { Say "  服务器说：$detail" }
    exit 1
}

Say ''
Say '============================================'
Say '  完成'
Say '============================================'
Say "  账号: $($found.email)"
Say '  让用户用新密码登录即可。'
Say '  用户手机上如果还留着旧的登录态，不用管 —— 改密码不会把他踢下线，'
Say '  等他下次重新登录时就会用到新密码。'
Say ''
