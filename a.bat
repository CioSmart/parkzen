cd C:\Proiecte\aplicatie parcare\parkzen
rm -rf .git
git init
git add .
git commit -m "init: fork from parking-app"
# creezi repo pe GitHub: parkzen
git remote add origin https://github.com/CioSmart/parkzen.git
git push -u origin main
pause 0 