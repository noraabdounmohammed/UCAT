@echo off
echo Building Medicu...
call npx vite build
echo.
echo Deploying to Netlify...
call npx netlify deploy --prod --dir=dist
echo.
echo Done! Check studyedit.com
pause
