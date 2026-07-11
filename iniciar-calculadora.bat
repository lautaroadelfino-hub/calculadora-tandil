@echo off
rem Inicia la calculadora en modo desarrollo (http://localhost:3000)
rem %~dp0 = carpeta donde esta este archivo, funciona en cualquier PC
cd /d "%~dp0"
npm run dev
pause
