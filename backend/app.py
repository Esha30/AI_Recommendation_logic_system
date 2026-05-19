from flask import Flask, request, jsonify
from flask_cors import CORS
from recommender import MovieRecommender
import os

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}}) # Enable CORS for all frontend requests

# Configure base directory and path to database
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
dataset_path = os.path.join(BASE_DIR, 'imdb_top_1000.csv')

print("Initializing CineMatch AI: Enterprise Recommendation Matrix...")
recommender = MovieRecommender(dataset_path)
print("CineMatch AI Recommendation Engine loaded and fully active!")

@app.route('/api/genres', methods=['GET'])
def get_genres_and_stars():
    """Extracts unique genres and actors dynamically from the loaded dataset for the frontend selection boards."""
    try:
        genres = recommender.get_dynamic_genres()
        stars = recommender.get_top_stars()
        return jsonify({
            "genres": genres,
            "stars": stars
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/search', methods=['GET'])
def search_movies():
    """Real-time movie auto-suggestions as user types."""
    query = request.args.get('q', '')
    if not query:
        return jsonify([]), 200
    try:
        results = recommender.search_movies(query)
        return jsonify(results), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/top_rated', methods=['GET'])
def get_top_rated():
    """Returns top rated movies calculated using the IMDb weighted rating formula."""
    try:
        top_n = int(request.args.get('limit', 10))
        results = recommender.get_trending_popularity(top_n=top_n)
        return jsonify(results), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/recommend', methods=['POST', 'OPTIONS'])
def recommend():
    """Main hybrid recommendation endpoint supporting multiple recommendation paradigms."""
    if request.method == 'OPTIONS':
        return jsonify({}), 200
        
    data = request.json or {}
    
    preferences = data.get('preferences', [])
    liked_movies = data.get('liked_movies', [])
    seed_title = data.get('seed_title', None)
    method = data.get('method', 'content')
    top_n = int(data.get('top_n', 8))
    
    try:
        # Run recommender with matching parameters
        recommendations = recommender.recommend(
            preferences=preferences,
            liked_titles=liked_movies,
            seed_title=seed_title,
            method=method,
            top_n=top_n
        )
        return jsonify(recommendations), 200
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    # Use Waitress for a production WSGI server
    from waitress import serve
    print("Starting Waitress production server on port 5000...")
    serve(app, host="0.0.0.0", port=5000)
