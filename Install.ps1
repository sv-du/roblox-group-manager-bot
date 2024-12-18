curl https://codeload.github.com/zachariapopcorn/roblox-group-manager-bot/zip/main -O "Roblox Group Manager.zip"
Expand-Archive "Roblox Group Manager.zip"
del "Roblox Group Manager.zip"
cd "Roblox Group Manager"
move roblox-group-manager-bot-main ..
cd ..
rd "Roblox Group Manager"
Rename-Item -Path roblox-group-manager-bot-main -NewName "Roblox Group Manager"
cd "Roblox Group Manager"
npm install
del .\Install.ps1
