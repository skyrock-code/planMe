@echo off
REM PlanMe Backend — development launcher
REM Run this once from the backend\ folder: double-click or "start_dev.bat" in terminal

REM ── 1. Create .env if it doesn't exist ──────────────────────────────────────
if not exist .env (
    echo .env not found — creating from template...
    copy .env.example .env
    echo.
    echo  IMPORTANT: Open backend\.env in a text editor and set HF_TOKEN
    echo  to your Hugging Face token (get one at huggingface.co/settings/tokens).
    echo  Then run this script again.
    echo.
    pause
    exit /b 1
)

REM ── 2. Check HF_TOKEN is actually filled in ──────────────────────────────────
findstr /C:"HF_TOKEN=" .env | findstr /V /C:"HF_TOKEN= " | findstr /V /C:"HF_TOKEN=$" > nul 2>&1
REM Simple check: warn if HF_TOKEN line ends with = (empty value)
for /f "tokens=2 delims==" %%A in ('findstr "HF_TOKEN" .env') do set HF_VAL=%%A
if "%HF_VAL%"=="" (
    echo WARNING: HF_TOKEN is empty in .env — AI will use rule-based fallback.
    echo Set HF_TOKEN=hf_... in backend\.env to enable AI meal generation.
    echo.
)

REM ── 3. Install / upgrade dependencies ───────────────────────────────────────
echo Installing dependencies...
pip install -r requirements.txt --quiet

REM ── 4. Start Flask ───────────────────────────────────────────────────────────
echo.
echo Starting PlanMe backend on http://127.0.0.1:5000
echo.
py app.py
