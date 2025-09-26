# 🏠 Déploiement sur Home Assistant

## 📋 Instructions de déploiement

### 1. **Build de l'application**
```bash
npm run build
```

### 2. **Création du dossier dans Home Assistant**
Dans votre Home Assistant, créez le dossier :
```
/config/www/learroom-assistant/
```

### 3. **Copie des fichiers**
Copiez tout le contenu du dossier `dist/` vers :
```
/config/www/learroom-assistant/
```

### 4. **Structure finale attendue**
```
/config/www/learroom-assistant/
├── index.html
├── css/
│   └── index-[hash].css
├── js/
│   └── index-[hash].js
├── images/ (si présent)
└── assets/ (autres fichiers)
```

### 5. **Accès à l'application**
L'application sera accessible via :
```
http://your-home-assistant:8123/local/learroom-assistant/
```

## 🔧 Configuration Home Assistant

### **Option 1 : Panel personnalisé (Recommandé)**
Ajoutez dans votre `configuration.yaml` :
```yaml
panel_iframe:
  learroom_assistant:
    title: "LearRoom Assistant"
    icon: mdi:robot
    url: "/local/learroom-assistant/"
    require_admin: false
```

### **Option 2 : Carte dans le dashboard**
Ajoutez une carte iframe :
```yaml
type: iframe
url: /local/learroom-assistant/
title: LearRoom Assistant
aspect_ratio: 100%
```

## 🚨 Problèmes courants et solutions

### **Problème : Écran blanc**
- Vérifiez que le chemin `/local/learroom-assistant/` est correct
- Ouvrez les outils de développement pour voir les erreurs

### **Problème : Fichiers CSS/JS non chargés**
- Vérifiez que tous les fichiers sont bien copiés
- Redémarrez Home Assistant

### **Problème : CORS ou sécurité**
Ajoutez dans `configuration.yaml` :
```yaml
http:
  cors_allowed_origins:
    - "http://localhost:5173"  # Pour le développement
  use_x_forwarded_for: true
  trusted_proxies:
    - 127.0.0.1
```

### **Problème : Authentification**
L'application utilise Supabase qui fonctionne indépendamment de Home Assistant.

## 📱 Accès mobile
L'application sera également accessible via l'app Home Assistant mobile.

## 🔄 Mise à jour
Pour mettre à jour :
1. `npm run build`
2. Remplacez le contenu de `/config/www/learroom-assistant/`
3. Videz le cache du navigateur (Ctrl+F5)

## 🛠️ Debug
Pour débugger, accédez directement à :
```
http://your-home-assistant:8123/local/learroom-assistant/index.html
```
