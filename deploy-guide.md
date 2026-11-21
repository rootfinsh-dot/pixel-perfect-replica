# 📦 Script de déploiement sur Lovable
# Usage: Ouvrir ce fichier dans VS Code, puis suivre les étapes

# 1. Vérifier l'état du dépôt local
echo "=== ÉTAT DU DÉPÔT LOCAL ==="
cd "C:\Users\LARBI OUDAVA\pixel-perfect-replica"
git status
echo ""

# 2. Vérifier les derniers commits
echo "=== DERNIERS COMMITS ==="
git log --oneline -5
echo ""

# 3. Faire un commit si nécessaire
echo "=== VÉRIFICATION DES MODIFICATIONS ==="
git diff --stat
echo ""
echo "Si vous voyez des modifications non commitées, faites :"
echo "  git add ."
echo "  git commit -m \"your message\""
echo "  git push origin main"
echo ""

# 4. Vérifier les fichiers clés
echo "=== FICHIERS CLÉS ==="
ls -la src/routes/pricing.tsx src/routes/_authenticated/pricing.tsx 2>&1
ls -la src/lib/site.ts 2>&1
echo ""

# 5. Build local (optionnel)
echo "=== BUILD LOCAL (optionnel) ==="
npm run build 2>&1 | tail -5
echo ""

echo "=========================================="
echo "✅ PROJET PRÊT POUR LE DÉPLOIEMENT"
echo "=========================================="
echo ""
echo "Prochaine étape : FORCER LE DÉPLOIEMENT SUR LOVABLE"
echo "=========================================="
echo ""
echo "1. Ouvrir https://lovable.com"
echo "2. Cliquer sur votre projet 'pixel-to-product-studio-29'"
echo "3. Menu Déploiement → Force Redeploy"
echo "4. Attendre 3-5 minutes"
echo "5. Ouvrir : https://pixel-to-product-studio-29.lovable.app/pricing"
echo ""
echo "✅ Si la page s'affiche, c'est bon !"
