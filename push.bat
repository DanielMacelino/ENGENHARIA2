@echo off
echo --- Iniciando Push para GitHub ---
git add .
git commit -m "Melhorias: Filtros globais, Seed de 100 alunos e Relatorio PDF profissional"
git push origin main
echo --- Processo concluído! ---
pause
