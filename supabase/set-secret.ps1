<#
	把 Supabase 的 secret 密钥存到本地。
	存进去之后，密钥就只在你电脑上，不进 git、也不进任何聊天记录。

	用法：
	    .\supabase\set-secret.ps1
	    .\supabase\set-secret.ps1 -Plain      （如果安全输入框粘贴不进去，用这个）

	密钥从哪拿：
	    Supabase Dashboard → Project Settings → API Keys → Secret keys
	    复制 sb_secret_... 开头那一串
	    （旧格式叫 service_role，也在同一个页面）

	⚠️ 别拿成 anon / publishable 那把 —— 那把没有管理权限。
#>
param(
	# 安全输入框粘不进去时用这个，会明文回显
	[switch]$Plain
)

$ErrorActionPreference = 'Stop'
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch { }

$Root       = Split-Path -Parent $PSScriptRoot
$SecretDir  = Join-Path $env:USERPROFILE '.jack-admin'
$SecretFile = Join-Path $SecretDir 'supabase-secret.txt'

Write-Host ''
Write-Host '  Supabase secret 密钥' -ForegroundColor Cyan
Write-Host ''
Write-Host '  拿密钥的地方：' -ForegroundColor DarkGray
Write-Host '    Dashboard → Project Settings → API Keys → Secret keys' -ForegroundColor DarkGray
Write-Host '    复制 sb_secret_... 开头那一串（旧格式叫 service_role）' -ForegroundColor DarkGray
Write-Host ''
if ($Plain) {
	Write-Host '  粘贴密钥后回车（会明文显示）：' -ForegroundColor Yellow
} else {
	Write-Host '  粘贴密钥后回车（输入过程不回显，粘贴完直接回车）：' -ForegroundColor DarkGray
}
Write-Host ''

if ($Plain) {
	$plain = Read-Host '  密钥'
} else {
	$sec  = Read-Host -AsSecureString '  密钥'
	$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
	try     { $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) }
	finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
}

# 粘贴经常带换行/空格，清掉
$plain = ($plain -replace '\s', '').Trim()

if (-not $plain) { Write-Host '  没读到内容，取消。' -ForegroundColor Yellow; exit 1 }

# ── 存之前先体检，免得存进去一把没用的 ──────────────────────────────
$kind = '未知类型'
$looksRight = $true
if     ($plain.StartsWith('sb_secret_'))      { $kind = '新版 secret 密钥' }
elseif ($plain.StartsWith('sb_publishable_')) { $kind = 'publishable（公开）密钥'; $looksRight = $false }
elseif ($plain.StartsWith('eyJ'))             { $kind = '旧版 JWT（可能是 anon，也可能是 service_role）' }
else                                          { $kind = '不像 Supabase 密钥'; $looksRight = $false }

Write-Host ''
Write-Host ("  读到 {0} 位，判断为：{1}" -f $plain.Length, $kind)

if (-not $looksRight) {
	Write-Host '  ⚠️ 这看起来不是 secret 密钥，存进去管理员命令会失败。' -ForegroundColor Yellow
	$ans = Read-Host '  还是要存吗？输 yes 继续'
	if ($ans -ne 'yes') { Write-Host '  已取消，什么都没存。' -ForegroundColor Yellow; Write-Host ''; exit 1 }
}

New-Item -ItemType Directory -Path $SecretDir -Force | Out-Null
[System.IO.File]::WriteAllText($SecretFile, $plain, (New-Object System.Text.UTF8Encoding($false)))

# ── 确认 git 真的挡得住 ─────────────────────────────────────────────
$ignored = ''
try { $ignored = (& git -C $Root check-ignore -v $SecretFile 2>$null | Out-String).Trim() } catch { }

Write-Host ''
Write-Host '  ✅ 已保存' -ForegroundColor Green
Write-Host ("     文件：{0}" -f $SecretFile) -ForegroundColor DarkGray
if ($ignored) {
	Write-Host '  ✅ 已被 .gitignore 挡住，不会提交到 git' -ForegroundColor Green
} else {
	Write-Host '  ⚠️ 没能确认 gitignore，自己检查一下' -ForegroundColor Yellow
}
Write-Host ''
Write-Host '  下一步验证密钥能不能用：' -ForegroundColor Cyan
Write-Host '      .\supabase\admin.ps1 whoami' -ForegroundColor Cyan
Write-Host ''
