# ============================================================
# 实测 Supabase 的「Rate limit for sign-ups and sign-ins」到底有没有按你配的数字生效
#
# 背景：这个设置在 Supabase 上被报告为「配了不生效」——
#   https://github.com/supabase/auth/issues/2333   （已关闭）
#   https://github.com/supabase/supabase/issues/41947 （仍开着，2026-07 还有人复现）
#   报告者的现象：设成 5 次/5 分钟，实际 42 次才被 429。
#
# 这个脚本的作用：在你自己的项目上量出「第几次开始 429」，作为基线。
# 用法：
#   1) 先跑一次，记下数字（当前设置下的基线）
#   2) 去控制台把那个数字改小（比如 30 → 10）
#   3) 隔 5 分钟以上（让桶回满）再跑一次
#   4) 两次数字一样 = 这个设置没生效（就是那个 bug）；数字跟着变 = 生效了
#
# 零副作用：用不存在的邮箱 + 错密码打 /auth/v1/token，
#   每次只回 invalid_credentials，不创建账号、不发送邮件。
# ============================================================
param(
	[int]$Count = 50,          # 打多少次
	[int]$DelayMs = 0          # 每次之间等多久；0 = 连发（跟报告者的复现方式一致）
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$authFile = Join-Path $root 'utils\auth.js'

if (-not (Test-Path $authFile)) { Write-Output "找不到 utils/auth.js：$authFile"; exit 1 }
$src = Get-Content $authFile -Raw

$urlMatch = [regex]::Match($src, "SUPABASE_URL\s*=\s*'([^']+)'")
$keyMatch = [regex]::Match($src, "SUPABASE_ANON_KEY\s*=\s*'([^']+)'")
if (-not $urlMatch.Success -or -not $keyMatch.Success) {
	Write-Output '没能从 utils/auth.js 里读出 SUPABASE_URL / SUPABASE_ANON_KEY'
	exit 1
}
$base = $urlMatch.Groups[1].Value.TrimEnd('/')
$anon = $keyMatch.Groups[1].Value

Write-Output "项目：$base"
Write-Output "连打 $Count 次错密码登录，看第几次开始 429"
Write-Output ('-' * 52)

$firstRateLimited = 0
$codes = @{}

for ($i = 1; $i -le $Count; $i++) {
	$body = @{
		email    = "ratelimit-probe-$i@example.invalid"
		password = 'definitely-not-the-password'
	} | ConvertTo-Json -Compress

	$code = 0
	try {
		$r = Invoke-WebRequest -Uri "$base/auth/v1/token?grant_type=password" `
			-Method POST -TimeoutSec 20 -UseBasicParsing `
			-Headers @{ apikey = $anon; 'content-type' = 'application/json' } `
			-Body $body
		$code = [int]$r.StatusCode
	} catch {
		$resp = $_.Exception.Response
		$code = if ($resp) { [int]$resp.StatusCode } else { -1 }
	}

	$codes[$code] = 1 + ($codes[$code] | ForEach-Object { $_ })

	if ($code -eq 429) {
		$firstRateLimited = $i
		Write-Output ("第 {0,3} 次 -> 429  <== 从这里开始被限流" -f $i)
		break
	} elseif ($i -le 5 -or $i % 10 -eq 0) {
		Write-Output ("第 {0,3} 次 -> {1}" -f $i, $code)
	}

	if ($DelayMs -gt 0) { Start-Sleep -Milliseconds $DelayMs }
}

Write-Output ('-' * 52)
Write-Output ('状态码统计：' + (($codes.GetEnumerator() | Sort-Object Name | ForEach-Object { "$($_.Key)x$($_.Value)" }) -join '  '))

if ($firstRateLimited -gt 0) {
	Write-Output "结论：第 $firstRateLimited 次开始 429"
} else {
	Write-Output "结论：连打 $Count 次都没被限流（把 -Count 调大再试，比如 -Count 200）"
}
