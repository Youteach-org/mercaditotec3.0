# Ir a la carpeta del proyecto (por si lo ejecutas desde otro lado)
Set-Location "C:\Users\BATMAN\Documents\Mecatrónica\8th semester\Mercadito 3\school-marketplace-app"

Write-Host "🚀 Subiendo cambios a GitHub..." -ForegroundColor Cyan

# Agregar todos los cambios
git add .

# Crear commit con fecha automática
$fecha = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
git commit -m "auto deploy $fecha"

# Subir a GitHub
git push

Write-Host "✅ Deploy enviado a GitHub (Vercel lo detectará automáticamente)" -ForegroundColor Green