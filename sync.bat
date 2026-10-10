@echo off
set msg=%*
if "%msg%"=="" set msg=Update from Antigravity IDE

echo [1/3] Adding changes...
git add .

echo [2/3] Committing: %msg%
git commit -m "%msg%"

echo [3/3] Pushing to GitHub...
git push origin main

echo Done! GitHub is up to date.
