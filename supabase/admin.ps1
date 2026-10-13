<#
	Supabase 账号管理工具（管理员用，走 Admin API）

	【密钥从哪来】
	  不写在脚本里，也不发到聊天里。放在：
	      C:\Users\<你的用户名>\.jack-admin\supabase-secret.txt
	  ★ 故意放在项目外面：项目会被打包、同步、发给别人，
	    放里面万一被打进 APK 就是灾难。
	  第一次用先跑：  .\supabase\set-secret.ps1

	【用法】
	  .\supabase\admin.ps1 whoami                        验证密钥能不能用
	  .\supabase\admin.ps1 list                          列出所有账号 + 最后登录时间
	  .\supabase\admin.ps1 add    -Email a@b.com -Password jackjie
	  .\supabase\admin.ps1 reset  -Email a@b.com -Password jackjie
	  .\supabase\admin.ps1 delete -Email a@b.com

	【密钥是哪一把】
	  Dashboard → Project Settings → API Keys → Secret keys 里的 sb_secret_...
	  （旧格式叫 service_role）。注意不是 anon / publishable 那把 —— 那把没权限。
#>
param(
	[Parameter(Position = 0)]
	[ValidateSet('whoami', 'list', 'add', 'reset', 'delete', 'help')]
	[string]$Action = 'help',

	[string]$Email,
	[string]$Password,

	# 临时指定密钥（不想存文件时用），正常不用传
	[string]$SecretKey,
	# 清掉已存的密钥
	[switch]$ForgetKey
)

$ErrorActionPreference = 'Stop'
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch { }

$Root       = Split-Path -Parent $PSScriptRoot
$AuthFile   = Join-Path $Root 'utils\auth.js'
$SecretDir  = Join-Path $env:USERPROFILE '.jack-admin'
$SecretFile = Join-Path $SecretDir 'supabase-secret.txt'

# ── 读配置 ────────────────────────────────────────────────────────────
function Get-SupabaseUrl {
	if (-not (Test-Path $AuthFile)) { throw "找不到 $AuthFile" }
	$t = Get-Content $AuthFile -Raw -Encoding UTF8
	$m = [regex]::Match($t, "SUPABASE_URL\s*=\s*'([^']+)'")
	if (-not $m.Success) { throw "没能从 utils\auth.js 里读到 SUPABASE_URL" }
	return $m.Groups[1].Value.TrimEnd('/')
}

function Get-SecretKey {
	if ($ForgetKey) {
		Remove-Item $SecretFile -Force -ErrorAction SilentlyContinue
		throw "已清掉存着的密钥。下次用之前重新跑 .\supabase\set-secret.ps1"
	}
	if ($SecretKey) { return $SecretKey.Trim() }
	if (-not (Test-Path $SecretFile)) {
		throw "还没存密钥。先跑： .\supabase\set-secret.ps1"
	}
	$k = (Get-Content $SecretFile -Raw -Encoding UTF8).Trim()
	if (-not $k) { throw "密钥文件是空的：$SecretFile" }
	return $k
}

# ── 请求 ──────────────────────────────────────────────────────────────
function Invoke-Api {
	param([string]$Method, [string]$Path, $Body, [string]$Key, [string]$Url)

	$p = @{
		Method     = $Method
		Uri        = "$Url$Path"
		Headers    = @{
			apikey         = $Key
			Authorization  = "Bearer $Key"
			'Content-Type' = 'application/json; charset=utf-8'
		}
		TimeoutSec = 60
		# ★ 必须指定 User-Agent！
		#   Windows PowerShell 5.1 默认发的是
		#     "Mozilla/5.0 (Windows NT; ...) WindowsPowerShell/5.1.xxxx"
		#   开头是 Mozilla，Supabase 会当成浏览器，直接把 secret 密钥拒掉：
		#     {"message":"Forbidden use of secret API key in browser"}
		#   报出来只是一句 "远程服务器返回错误: (401)"，很难看出原因。
		#   实测：默认 UA → 401；换成下面这个 → 200。
		UserAgent  = 'jack-admin-local/1.0'
	}
	if ($null -ne $Body) {
		$p.Body = [System.Text.Encoding]::UTF8.GetBytes(($Body | ConvertTo-Json -Depth 8 -Compress))
	}
	try {
		return Invoke-RestMethod @p
	} catch {
		# 把服务端返回的原文捞出来 —— 不然只看到 "远程服务器返回错误 (401)"
		$detail = ''
		try {
			$resp = $_.Exception.Response
			if ($resp) {
				$sr = New-Object System.IO.StreamReader($resp.GetResponseStream(), [System.Text.Encoding]::UTF8)
				$detail = $sr.ReadToEnd()
			}
		} catch { }
		$status = ''
		try { $status = [int]$_.Exception.Response.StatusCode } catch { }
		$msg = $_.Exception.Message
		if ($detail) { $msg = "$msg`n      服务端说：$detail" }
		if ($status) { $msg = "$msg`n      HTTP $status" }
		throw $msg
	}
}

# ── 用户列表（分页拉全） ───────────────────────────────────────────────
function Get-AllUsers {
	param([string]$Key, [string]$Url)
	$all  = @()
	$page = 1
	while ($page -le 50) {
		$r = Invoke-Api -Method GET -Path "/auth/v1/admin/users?page=$page&per_page=200" -Key $Key -Url $Url
		$batch = @()
		if ($r -is [array])          { $batch = $r }
		elseif ($r -and $r.users)    { $batch = $r.users }
		if ($batch.Count -eq 0) { break }
		$all += $batch
		if ($batch.Count -lt 200) { break }
		$page++
	}
	return $all
}

function Find-User {
	param($Users, [string]$Mail)
	$want = $Mail.Trim().ToLower()
	$hit  = $Users | Where-Object { $_.email -and $_.email.ToLower() -eq $want }
	if (-not $hit) { throw "没有找到邮箱是 $Mail 的账号。先用 list 看看有哪些。" }
	return @($hit)[0]
}

function Format-Time($iso) {
	if (-not $iso) { return '—' }
	try { return ([datetime]$iso).ToLocalTime().ToString('yyyy-MM-dd HH:mm') } catch { return [string]$iso }
}

function Show-KeyInfo([string]$Key) {
	$kind = '未知'
	if ($Key.StartsWith('sb_secret_'))      { $kind = '新版 secret 密钥 ✅' }
	elseif ($Key.StartsWith('sb_publishable_')) { $kind = '❌ 这是 publishable（公开）密钥，没管理权限' }
	elseif ($Key.StartsWith('eyJ'))         { $kind = '旧版 JWT（anon 或 service_role）' }
	$len = $Key.Length
	Write-Host ("  密钥类型 : {0}" -f $kind)
	Write-Host ("  密钥长度 : {0}" -f $len)
	Write-Host ("  密钥前缀 : {0}…（只看前 12 位，完整的不打印）" -f $Key.Substring(0, [Math]::Min(12, $len)))
}

# ── 主流程 ────────────────────────────────────────────────────────────
function Show-Help {
	Write-Host ''
	Write-Host '  Supabase 账号管理' -ForegroundColor Cyan
	Write-Host ''
	Write-Host '    .\supabase\admin.ps1 whoami                        验证密钥'
	Write-Host '    .\supabase\admin.ps1 list                          列出所有账号 + 最后登录'
	Write-Host '    .\supabase\admin.ps1 add    -Email a@b.com -Password jackjie'
	Write-Host '    .\supabase\admin.ps1 reset  -Email a@b.com -Password jackjie'
	Write-Host '    .\supabase\admin.ps1 delete -Email a@b.com'
	Write-Host ''
	Write-Host '  密钥存在 C:\Users\<你>\.jack-admin\supabase-secret.txt（项目外面，不会被打包）'
	Write-Host '  第一次用先跑： .\supabase\set-secret.ps1'
	Write-Host ''
}

if ($Action -eq 'help') { Show-Help; exit 0 }

try {
$Url = Get-SupabaseUrl
$Key = Get-SecretKey

Write-Host ''
Write-Host ("  项目 : {0}" -f $Url) -ForegroundColor DarkGray

switch ($Action) {

	'whoami' {
		Show-KeyInfo $Key
		try {
			$r = Invoke-Api -Method GET -Path '/auth/v1/admin/users?page=1&per_page=1' -Key $Key -Url $Url
			$n = 0
			if ($r -is [array])       { $n = $r.Count }
			elseif ($r -and $r.users) { $n = $r.users.Count }
			$total = ($r | Get-Member -Name total -ErrorAction SilentlyContinue)
			Write-Host ''
			Write-Host '  ✅ 密钥可用，能读到用户列表' -ForegroundColor Green
			if ($r.total) { Write-Host ("     账号总数：{0}" -f $r.total) }
		} catch {
			Write-Host ''
			Write-Host '  ❌ 密钥用不了' -ForegroundColor Red
			Write-Host ("     {0}" -f $_) -ForegroundColor Red
			exit 1
		}
	}

	'list' {
		Write-Host ''
		Write-Host '  正在拉账号列表…' -ForegroundColor DarkGray
		$users = Get-AllUsers -Key $Key -Url $Url
		if ($users.Count -eq 0) { Write-Host '  一个账号都没有。' ; exit 0 }

		$sorted = $users | Sort-Object { $_.created_at }
		$used   = @($sorted | Where-Object { $_.last_sign_in_at })
		$unused = @($sorted | Where-Object { -not $_.last_sign_in_at })

		Write-Host ''
		Write-Host ("  {0,-34} {1,-9} {2,-17} {3}" -f '邮箱', '状态', '创建时间', '最后登录') -ForegroundColor Cyan
		Write-Host ('  ' + ('─' * 84)) -ForegroundColor DarkGray
		foreach ($u in $sorted) {
			$state = if ($u.last_sign_in_at) { '✅ 已使用' } else { '⬜ 未使用' }
			$color = if ($u.last_sign_in_at) { 'Gray' } else { 'Yellow' }
			Write-Host ("  {0,-34} {1,-9} {2,-17} {3}" -f `
				$u.email, $state, (Format-Time $u.created_at), (Format-Time $u.last_sign_in_at)) -ForegroundColor $color
		}
		Write-Host ''
		Write-Host ("  合计 {0} 个：已使用 {1} 个，发了没用 {2} 个" -f $users.Count, $used.Count, $unused.Count) -ForegroundColor Cyan
		Write-Host ''
	}

	'add' {
		if (-not $Email)    { throw '要传 -Email' }
		if (-not $Password) { throw '要传 -Password' }
		if ($Password.Length -lt 6) { throw '密码至少 6 位（Supabase 的硬要求）' }

		Write-Host ''
		Write-Host ("  正在建号：{0}" -f $Email) -ForegroundColor DarkGray
		$body = @{ email = $Email.Trim(); password = $Password; email_confirm = $true }
		$u = Invoke-Api -Method POST -Path '/auth/v1/admin/users' -Body $body -Key $Key -Url $Url

		Write-Host ''
		Write-Host '  ✅ 建好了（已自动确认，不发任何邮件）' -ForegroundColor Green
		Write-Host ("     邮箱 : {0}" -f $u.email)
		Write-Host ("     密码 : {0}" -f $Password)
		Write-Host ("     id   : {0}" -f $u.id)
		Write-Host ''
		Write-Host '  把邮箱和密码发给用户就行。' -ForegroundColor Cyan
		Write-Host ''
	}

	'reset' {
		if (-not $Email)    { throw '要传 -Email' }
		if (-not $Password) { throw '要传 -Password' }
		if ($Password.Length -lt 6) { throw '密码至少 6 位（Supabase 的硬要求）' }

		Write-Host ''
		Write-Host ("  正在找 {0} …" -f $Email) -ForegroundColor DarkGray
		$u = Find-User (Get-AllUsers -Key $Key -Url $Url) $Email
		Write-Host ("  找到：{0}（id {1}）" -f $u.email, $u.id) -ForegroundColor DarkGray

		Invoke-Api -Method PUT -Path "/auth/v1/admin/users/$($u.id)" -Body @{ password = $Password } -Key $Key -Url $Url | Out-Null

		Write-Host ''
		Write-Host '  ✅ 密码已重置' -ForegroundColor Green
		Write-Host ("     邮箱   : {0}" -f $u.email)
		Write-Host ("     新密码 : {0}" -f $Password)
		Write-Host ''
		Write-Host '  用户用新密码就能登录，旧密码立刻失效。' -ForegroundColor Cyan
		Write-Host ''
	}

	'delete' {
		if (-not $Email) { throw '要传 -Email' }

		$u = Find-User (Get-AllUsers -Key $Key -Url $Url) $Email
		Write-Host ''
		Write-Host ("  要删的是：{0}（创建于 {1}，最后登录 {2}）" -f `
			$u.email, (Format-Time $u.created_at), (Format-Time $u.last_sign_in_at)) -ForegroundColor Yellow
		$ans = Read-Host '  确认删除？输 yes 才删'
		if ($ans -ne 'yes') { Write-Host '  已取消。' ; exit 0 }

		Invoke-Api -Method DELETE -Path "/auth/v1/admin/users/$($u.id)" -Key $Key -Url $Url | Out-Null
		Write-Host ''
		Write-Host ("  ✅ 已删除 {0}" -f $u.email) -ForegroundColor Green
		Write-Host ''
	}
	}
} catch {
	# 自己 throw 的中文提示、还有服务端的报错，都从这里干净地打一行出来。
	# 不要 PowerShell 那串堆栈 —— 又长又看不懂。
	Write-Host ''
	Write-Host ("  ❌ {0}" -f $_.Exception.Message) -ForegroundColor Red
	Write-Host ''
	exit 1
}
