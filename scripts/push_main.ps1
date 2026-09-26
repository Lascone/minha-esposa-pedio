$token = (gh auth token).Trim()
git remote set-url origin "https://Lascone:$token@github.com/Lascone/minha-esposa-pedio.git"
try {
    git push origin main
    Write-Host "[OK] Push realizado com sucesso!" -ForegroundColor Green
} finally {
    git remote set-url origin "https://github.com/Lascone/minha-esposa-pedio.git"
}
