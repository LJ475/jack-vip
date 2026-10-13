@echo off
title 账号管理后台
cd /d "%~dp0.."

where node >nul 2>nul
if errorlevel 1 (
	echo.
	echo   [X] 没找到 node.exe，装一个 Node.js 再来。
	echo       下载: https://nodejs.org/
	echo.
	pause
	exit /b 1
)

if not exist "%USERPROFILE%\.jack-admin\supabase-secret.txt" (
	echo.
	echo   [X] 还没放密钥。
	echo       把 sb_secret_... 写进 %USERPROFILE%\.jack-admin\supabase-secret.txt
	echo.
	pause
	exit /b 1
)

echo.
echo   正在启动...
echo.

start "" http://127.0.0.1:8787/
node "supabase\admin-server.mjs"

echo.
echo   服务已停止。关掉这个窗口就行。
pause
