@echo off
title Minibus Dashboard Deploy

echo.
echo ========================================
echo   Minibus Dashboard Deploy
echo   ミニバス用ダッシュボード デプロイ
echo ========================================
echo.

cd /d "%~dp0"

call npm run deploy

echo.
echo ========================================
if %errorlevel% equ 0 (
    echo   [OK] デプロイ完了！
    echo   1～2分後にGitHub Pagesに反映されます
    echo   URL: https://i2f0726.github.io/antelopes-manager/
) else (
    echo   [ERROR] エラーが発生しました
    echo   上のメッセージを確認してください
)
echo ========================================
echo.
echo このウィンドウを閉じるには何かキーを押してください...
pause > nul
