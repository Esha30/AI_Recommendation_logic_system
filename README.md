# CineMatch AI: Enterprise Recommendation Matrix

An industry-grade, AI-powered movie discovery platform that integrates content-based natural language processing (TF-IDF Vector Space Models), interactive user taste profile modeling, and the official IMDb weighted rating formula on the Kaggle IMDb Top 1000 Dataset.

---

## 1. Architectural Blueprint & Features

CineMatch AI is engineered with a modern decoupled layout, allowing real-time recommendation calculations on a Python Flask API, served to a responsive, next-generation dark glassmorphism web cockpit in Next.js 16 and Tailwind CSS v4.

### Key Capabilities
*   **Kaggle Database Integration**: Operates dynamically on a 1,000-movie Kaggle dataset including real covers, directors, cast members, synopses, runtimes, and voting populations.
*   **Online Ingestion Pipeline**: Auto-downloads and parses the source CSV on server initialization, with a built-in static fallback framework to ensure 100% startup uptime in offline or constrained environments.
*   **Referrer Policy Safeguard**: Bypasses browser cross-origin blocking on IMDb/Amazon image CDNs using an enterprise-grade `referrerPolicy="no-referrer"` configuration, restoring high-definition covers across the entire platform.
*   **Dynamic Tag Harvesting**: No hardcoded categories. The backend dynamically harvests and extracts unique genres and cast list actors from the active database to feed search toggles.
*   **Three recommendation vectors**:
    1.  **AI Matchmaker (Content-Based NLP)**: Employs `TfidfVectorizer` to construct a high-dimensional text coordinate for each movie using overviews, genres, directors, and stars. Applies Cosine Distance measurements against arbitrary user prompts or tag lists.
    2.  **Taste Profile Builder (Latent Vector Modeling)**: Users search and "like" seed movies. The system dynamically computes the average of the selected movie vectors to model a unified user taste coordinate in real-time.
    3.  **IMDb Weighted Popularity Charts**: Employs the official IMDb weighted score formula to rank trending charts, filtering out obscure ratings with insufficient voter pools.

---

## 2. Advanced Recommendation Algorithms

### A. Cosine Similarity Space
CineMatch AI vectorizes semantic attributes to compute distances between films:
$$\text{Similarity}(\vec{A}, \vec{B}) = \cos(\theta) = \frac{\vec{A} \cdot \vec{B}}{\|\vec{A}\| \|\vec{B}\|}$$

When a user profiles their taste with multiple films, we model their interest using a Centroid User Vector:
$$\vec{U}_{\text{profile}} = \frac{1}{N} \sum_{i=1}^{N} \vec{V}_{\text{movie}_i}$$

### B. IMDb Weighted Rating (WR)
$$\text{Weighted Score} = \left(\frac{v}{v + m}\right) \cdot R + \left(\frac{m}{v + m}\right) \cdot C$$
*   $v$: Movie vote population (`No_of_Votes`).
*   $m$: Minimum vote threshold (dynamically set to the 85th percentile to balance indie gems and summer blockbusters).
*   $R$: Rating value (`IMDB_Rating`).
*   $C$: Mean vote across the active database.

---

## 3. Web API Endpoints

Exposed at `http://127.0.0.1:5000`:

*   `GET /api/genres`: Returns unique categories and cast lists dynamically.
*   `GET /api/search?q={query}`: Auto-completes movie titles in real-time.
*   `GET /api/top_rated?limit={count}`: Renders IMDb Weighted charts.
*   `POST /api/recommend`: The main recommendation gate supporting genre preferences, multiple movie seeds, or single movie clones.

---

## 4. Quick Start

### 1. Bootstrapping the Flask Backend
Navigate to the `/backend` folder:
```bash
cd backend
```
Create and activate the virtual environment, install requirements, and execute the server:
```bash
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
python -u app.py
```
*The engine will start, download the Kaggle database, compile the TF-IDF index, and listen on port `5000`.*

### 2. Launching the Next.js Frontend
Navigate to the `/frontend` folder:
```bash
cd frontend
npm install
npm run dev
```
*Open `http://localhost:3000` to interact with the glassmorphic cockpit.*
