@echo off
title Antelopes JHS Boys Deploy
chcp 65001 > nul

echo.
echo ========================================
echo   Antelopes JHS Boys Deploy
echo ========================================
echo.

cd /d "%~dp0"

call npm run deploy

echo.
pause
