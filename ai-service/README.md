# Service IA — StockWise

Ce dossier contient la partie intelligence artificielle du projet : entraînement, modèle et API de détection d'anomalies.

## Ce qui a été fait

- **Modèle v3** : `models/isolation_forest_v3.joblib` avec sa configuration `models/inference_config_v3.json` (liste des features numériques et seuil de décision).
- **Données synthétiques** : `data/ifc_synthetic_dataset_v2.csv` et `data/ifc_synthetic_dataset_v3.csv`, générées par `generate_dataset_v2.py` et `generate_dataset_v3.py`, pour rendre l'entraînement reproductible.
- **API FastAPI** (`main.py`) :
  - `GET /health` : état du service, version du modèle et seuil utilisé ;
  - `POST /predict` : reçoit un mouvement et son historique, calcule un score d'anomalie et répond avec `score`, `threshold`, `is_anomaly` et `model_version`.
- **Features causales** : `features.py` extrait des compteurs et signaux temporels par produit/entrepôt ; `add_movement_context_features` ajoute le contexte du mouvement.
- **Conteneurisation** : `Dockerfile` (Python 3.12) et `.dockerignore`. Le service est lancé dans `docker-compose.yml` sur le port `8011`.
- **Tests** : `tests/test_main.py` vérifie le chargement du modèle, le seuil, et qu'une quantité inhabituelle est bien détectée comme anomalie.

## Lien avec le backend

Le backend NestJS appelle `POST /predict` via la variable d'environnement `AI_SERVICE_URL` (`http://ai:8000` dans Docker, `http://localhost:8000` en local). Lorsque le score dépasse le seuil, une alerte est enregistrée dans la table Prisma `Alert`, liée au mouvement concerné. Si le service IA est indisponible, le mouvement est quand même validé.

## Lancer en local

```bash
cd ai-service
python -m venv .venv
```

Windows :

```powershell
.venv\Scripts\activate
```

macOS / Linux :

```bash
source .venv/bin/activate
```

Puis :

```bash
pip install -r requirements.txt pytest
uvicorn main:app --reload --port 8000
```

Tests :

```bash
pytest -q
```

Documentation interactive de l'API : http://localhost:8000/docs.
