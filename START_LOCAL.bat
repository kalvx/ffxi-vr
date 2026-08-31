@echo off
cd /d "%~dp0"
start "FFXI VR: Current Reality Local Site" http://localhost:8765/
py -m http.server 8765
