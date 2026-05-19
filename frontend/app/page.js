'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clapperboard, Star, Sparkles, Loader2, ArrowRight, 
  Search, Heart, User, Film, Calendar, Clock, Plus, 
  Trash2, X, Eye, Award, Sliders, Flame, ArrowLeft, RefreshCw,
  Sun, Moon, LogIn, LogOut, Check
} from 'lucide-react';

const API_BASE = 'http://127.0.0.1:5000';

export default function Home() {
  // Tabs & Navigation
  const [activeTab, setActiveTab] = useState('matchmaker'); // 'matchmaker', 'profile', 'trending'
  
  // Theme Manager ('dark' | 'light')
  const [theme, setTheme] = useState('dark');
  
  // User Authentication states
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  
  // Auth Form Controls
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authError, setAuthError] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  
  // Profile dropdown and Notification toasts
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  
  // Dynamic metadata from backend
  const [availableGenres, setAvailableGenres] = useState([]);
  const [availableStars, setAvailableStars] = useState([]);
  
  // Selection states (AI Matchmaker)
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [selectedStars, setSelectedStars] = useState([]);
  const [textPrompt, setTextPrompt] = useState('');
  
  // Profile / Seed states
  const [likedMovies, setLikedMovies] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Recommendations and items
  const [recommendations, setRecommendations] = useState([]);
  const [trendingMovies, setTrendingMovies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  
  // Details Modal
  const [activeDetailMovie, setActiveDetailMovie] = useState(null);
  
  // Autocomplete ref for clicking outside
  const searchContainerRef = useRef(null);

  // Load initial backend database data (genres, actors, trending) and user session
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/genres`);
        const data = await response.json();
        if (data.genres) setAvailableGenres(data.genres);
        if (data.stars) setAvailableStars(data.stars);
      } catch (err) {
        console.error("Failed to load metadata from backend:", err);
      }
    };

    const fetchTrending = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/top_rated?limit=12`);
        const data = await response.json();
        setTrendingMovies(data);
      } catch (err) {
        console.error("Failed to load trending movies:", err);
      }
    };

    // Load active session from localStorage
    const savedUser = localStorage.getItem('cinematch_user');
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setUser(userData);
        setIsLoggedIn(true);
      } catch (err) {
        console.error("Error restoring user session:", err);
      }
    }

    fetchMetadata();
    fetchTrending();
  }, []);

  // Handle autocomplete search suggestions
  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (searchQuery.trim().length < 2) {
        setSearchSuggestions([]);
        return;
      }
      try {
        const response = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(searchQuery)}`);
        const data = await response.json();
        setSearchSuggestions(data);
      } catch (err) {
        console.error("Error fetching search suggestions:", err);
      }
    }, 250);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  // Click outside to close autocomplete dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset all preferences
  const handleResetPreferences = () => {
    setSelectedGenres([]);
    setSelectedStars([]);
    setTextPrompt('');
    setRecommendations([]);
    setHasSearched(false);
  };

  // Toggle selection helper
  const toggleSelection = (item, list, setList) => {
    if (list.includes(item)) {
      setList(list.filter(i => i !== item));
    } else {
      setList([...list, item]);
    }
  };

  // 1. Get Recommendations based on active AI Matchmaker state
  const getAIMatchRecommendations = async () => {
    setLoading(true);
    setHasSearched(true);
    
    const preferences = [
      ...selectedGenres,
      ...selectedStars,
      ...(textPrompt ? [textPrompt] : [])
    ];
    
    try {
      const response = await fetch(`${API_BASE}/api/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferences: preferences,
          top_n: 8
        }),
      });
      const data = await response.json();
      setRecommendations(data);
    } catch (error) {
      console.error("Failed to fetch match recommendations:", error);
    } finally {
      setLoading(false);
    }
  };

  // 2. Get Profile-based Recommendations (based on seed liked list)
  const getProfileRecommendations = async (customLikedList = null) => {
    const listToQuery = customLikedList || likedMovies;
    if (listToQuery.length === 0) {
      setRecommendations([]);
      return;
    }
    
    setLoading(true);
    setHasSearched(true);
    
    try {
      const response = await fetch(`${API_BASE}/api/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          liked_movies: listToQuery,
          method: 'profile',
          top_n: 8
        }),
      });
      const data = await response.json();
      setRecommendations(data);
    } catch (error) {
      console.error("Failed to fetch profile recommendations:", error);
    } finally {
      setLoading(false);
    }
  };

  // 3. Recommend Similar to one specific seed movie (modal quick recommendation)
  const getSimilarRecommendations = async (movieTitle) => {
    setActiveDetailMovie(null); // Close modal
    setLoading(true);
    setHasSearched(true);
    setActiveTab('profile');
    
    try {
      const response = await fetch(`${API_BASE}/api/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seed_title: movieTitle,
          top_n: 8
        }),
      });
      const data = await response.json();
      setRecommendations(data);
      setSearchQuery(`Similar to: ${movieTitle}`);
    } catch (error) {
      console.error("Failed to fetch similar recommendations:", error);
    } finally {
      setLoading(false);
    }
  };

  // Add a movie to liked list and auto-refresh suggestions
  const handleLikeMovie = (movie) => {
    if (likedMovies.includes(movie.title)) return;
    const newLiked = [...likedMovies, movie.title];
    setLikedMovies(newLiked);
    setSearchQuery('');
    setSearchSuggestions([]);
    setShowSuggestions(false);
    
    getProfileRecommendations(newLiked);
  };

  // Remove a movie from liked list
  const handleRemoveLiked = (movieTitle) => {
    const newLiked = likedMovies.filter(t => t !== movieTitle);
    setLikedMovies(newLiked);
    
    if (newLiked.length > 0) {
      getProfileRecommendations(newLiked);
    } else {
      setRecommendations([]);
      setHasSearched(false);
    }
  };

  // Authentication Form Submit Handler
  const handleAuthSubmit = (e) => {
    e.preventDefault();
    if (!authEmail || !authPassword) {
      setAuthError('Please fill out all fields.');
      return;
    }
    if (isSignUp && !authName) {
      setAuthError('Please enter your name.');
      return;
    }

    setIsAuthLoading(true);
    setAuthError('');

    // Simulate server response delay
    setTimeout(() => {
      setIsAuthLoading(false);
      const nameForProfile = isSignUp ? authName : authEmail.split('@')[0];
      const userData = { name: nameForProfile, email: authEmail };
      
      setUser(userData);
      setIsLoggedIn(true);
      
      // Save state to local storage
      localStorage.setItem('cinematch_user', JSON.stringify(userData));

      showToastNotification(`Welcome back, ${nameForProfile}!`);
      
      // Close Modal and clear inputs
      setIsAuthModalOpen(false);
      setAuthEmail('');
      setAuthPassword('');
      setAuthName('');
    }, 1200);
  };

  // Logout Handler
  const handleLogout = () => {
    localStorage.removeItem('cinematch_user');
    setUser(null);
    setIsLoggedIn(false);
    setIsProfileOpen(false);
    showToastNotification("Logged out successfully.");
    
    // Clear user taste profile states
    setLikedMovies([]);
    setRecommendations([]);
    setHasSearched(false);
  };

  // Helper to trigger toast warnings/successes
  const showToastNotification = (msg) => {
    setToast({ show: true, message: msg, type: 'success' });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 font-sans selection:bg-indigo-500/30 overflow-x-hidden relative ${
      theme === 'dark' ? 'bg-black text-white' : 'bg-slate-50 text-slate-900'
    }`}>
      
      {/* Decorative Glow Elements */}
      <div className={`absolute top-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full blur-[150px] pointer-events-none transition-all duration-300 ${
        theme === 'dark' ? 'bg-indigo-500/10' : 'bg-indigo-500/5'
      }`} />
      <div className={`absolute top-[30%] right-[-10%] w-[700px] h-[700px] rounded-full blur-[180px] pointer-events-none transition-all duration-300 ${
        theme === 'dark' ? 'bg-purple-500/5' : 'bg-purple-500/3'
      }`} />
      <div className={`absolute bottom-[-10%] left-[20%] w-[600px] h-[600px] rounded-full blur-[160px] pointer-events-none transition-all duration-300 ${
        theme === 'dark' ? 'bg-emerald-500/5' : 'bg-emerald-500/3'
      }`} />

      {/* Header / Navigation */}
      <nav className={`border-b transition-all duration-300 sticky top-0 z-40 backdrop-blur-xl ${
        theme === 'dark' ? 'border-white/10 bg-black/70' : 'border-slate-200 bg-white/80 shadow-sm'
      }`}>
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 text-2xl font-black bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent tracking-tight cursor-pointer" onClick={() => window.location.reload()}>
            <div className="bg-gradient-to-tr from-indigo-500 to-purple-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-500/20">
              <Clapperboard size={24} />
            </div>
            <span>CINEMATCH <span className={theme === 'dark' ? 'text-white' : 'text-slate-900'}>AI</span></span>
          </div>
          
          {/* Navigation Tabs */}
          <div className={`hidden md:flex items-center gap-1 p-1 rounded-full border transition-all duration-300 ${
            theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-slate-200'
          }`}>
            <button 
              onClick={() => { setActiveTab('matchmaker'); setHasSearched(false); setRecommendations([]); }}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-300 flex items-center gap-2 ${
                activeTab === 'matchmaker' 
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md shadow-indigo-500/15' 
                  : (theme === 'dark' ? 'text-neutral-400 hover:text-white' : 'text-slate-500 hover:text-slate-800')
              }`}
            >
              <Sparkles size={16} />
              AI Matchmaker
            </button>
            <button 
              onClick={() => { setActiveTab('profile'); setHasSearched(false); setRecommendations([]); }}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-300 flex items-center gap-2 ${
                activeTab === 'profile' 
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md shadow-indigo-500/15' 
                  : (theme === 'dark' ? 'text-neutral-400 hover:text-white' : 'text-slate-500 hover:text-slate-800')
              }`}
            >
              <Heart size={16} />
              Taste Profile
            </button>
            <button 
              onClick={() => { setActiveTab('trending'); }}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-300 flex items-center gap-2 ${
                activeTab === 'trending' 
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md shadow-indigo-500/15' 
                  : (theme === 'dark' ? 'text-neutral-400 hover:text-white' : 'text-slate-500 hover:text-slate-800')
              }`}
            >
              <Flame size={16} />
              Trending Charts
            </button>
          </div>

          <div className="flex items-center gap-4">
            
            {/* Theme Toggle Button */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className={`p-2.5 rounded-xl border transition-all duration-300 ${
                theme === 'dark'
                  ? 'bg-neutral-900 border-white/10 hover:bg-neutral-800 text-yellow-400'
                  : 'bg-white border-slate-200 hover:bg-slate-100 text-indigo-500 shadow-sm'
              }`}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Authentication Buttons & Profile dropdown */}
            {!isLoggedIn ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setIsSignUp(false); setIsAuthModalOpen(true); }}
                  className={`px-4 py-2 text-xs font-bold rounded-xl transition-all duration-300 ${
                    theme === 'dark' ? 'text-neutral-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Log In
                </button>
                <button
                  onClick={() => { setIsSignUp(true); setIsAuthModalOpen(true); }}
                  className="px-4 py-2 text-xs font-black rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white shadow-md shadow-indigo-500/15 transition-all duration-300 active:scale-95"
                >
                  Sign Up
                </button>
              </div>
            ) : (
              <div className="relative">
                <div 
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className={`flex items-center gap-3 cursor-pointer p-1.5 pl-3 rounded-2xl border transition-all duration-300 select-none ${
                    theme === 'dark' ? 'bg-neutral-900 border-white/10 hover:border-white/20' : 'bg-slate-100 border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  <span className="text-xs font-bold max-w-[80px] truncate">Hi, {user.name}</span>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-black shadow shadow-indigo-500/25">
                    {user.name.slice(0, 2).toUpperCase()}
                  </div>
                </div>

                {/* Profile drop-down */}
                <AnimatePresence>
                  {isProfileOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className={`absolute right-0 top-[110%] w-56 border rounded-2xl p-4 shadow-2xl z-50 transition-all duration-300 ${
                        theme === 'dark' ? 'bg-neutral-900 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
                      }`}
                    >
                      <div className="space-y-3">
                        <div>
                          <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Active Account</h4>
                          <p className="text-sm font-extrabold truncate">{user.name}</p>
                          <p className="text-[10px] text-neutral-500 truncate">{user.email}</p>
                        </div>
                        <div className="border-t border-white/10 pt-2 text-[10px] text-neutral-500">
                          <span className="block">Status: <b>Taste Vector Saved</b></span>
                          <span className="block">Seeds Liked: <b>{likedMovies.length}</b></span>
                        </div>
                        <button
                          onClick={handleLogout}
                          className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold py-2 rounded-xl text-xs transition-colors border border-red-500/20 flex items-center justify-center gap-1.5"
                        >
                          <LogOut size={12} /> Log Out
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation Tabs */}
        <div className={`md:hidden flex border-t p-2 justify-around gap-1 ${
          theme === 'dark' ? 'border-white/5 bg-black/60' : 'border-slate-200 bg-slate-100'
        }`}>
          <button 
            onClick={() => { setActiveTab('matchmaker'); setHasSearched(false); setRecommendations([]); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg flex flex-col items-center gap-1 ${
              activeTab === 'matchmaker' ? 'text-indigo-400 bg-white/5' : 'text-neutral-400'
            }`}
          >
            <Sparkles size={16} />
            Matchmaker
          </button>
          <button 
            onClick={() => { setActiveTab('profile'); setHasSearched(false); setRecommendations([]); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg flex flex-col items-center gap-1 ${
              activeTab === 'profile' ? 'text-indigo-400 bg-white/5' : 'text-neutral-400'
            }`}
          >
            <Heart size={16} />
            Taste Profile
          </button>
          <button 
            onClick={() => { setActiveTab('trending'); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg flex flex-col items-center gap-1 ${
              activeTab === 'trending' ? 'text-indigo-400 bg-white/5' : 'text-neutral-400'
            }`}
          >
            <Flame size={16} />
            Trending
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-6 py-8 md:py-16 relative z-10">
        
        {/* Active Tab: AI Matchmaker */}
        {activeTab === 'matchmaker' && (
          <div className="grid lg:grid-cols-12 gap-12 items-start">
            
            {/* Preferences Selector Column */}
            <div className={`lg:col-span-5 p-8 rounded-3xl border transition-all duration-300 shadow-2xl backdrop-blur-xl ${
              theme === 'dark' ? 'bg-neutral-900/40 border-white/10 shadow-black/50' : 'bg-white border-slate-200/80 shadow-slate-100'
            }`}>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-widest">
                  <Sliders size={14} />
                  <span>Cognitive Space Mapping</span>
                </div>
                <h2 className="text-3xl font-extrabold tracking-tight">AI Preference Profile</h2>
                <p className={`text-sm leading-relaxed ${theme === 'dark' ? 'text-neutral-400' : 'text-slate-500'}`}>
                  Select genres, stars, and key concepts to find movies that map onto your unique taste coordinates.
                </p>
              </div>

              {/* Text Input Prompt */}
              <div className="space-y-2 mt-6">
                <label className={`text-sm font-bold flex justify-between ${theme === 'dark' ? 'text-neutral-300' : 'text-slate-700'}`}>
                  <span>Describe your perfect film...</span>
                  <span className="text-xs text-neutral-500 font-normal">Optional</span>
                </label>
                <textarea 
                  value={textPrompt}
                  onChange={(e) => setTextPrompt(e.target.value)}
                  placeholder="e.g. A mind-bending space exploration with quantum physics and beautiful score..."
                  className={`w-full h-24 rounded-2xl p-4 text-sm focus:outline-none transition-all duration-300 resize-none ${
                    theme === 'dark' 
                      ? 'bg-black/60 border-white/10 text-white placeholder-neutral-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20'
                  }`}
                />
              </div>

              {/* Dynamic Genres */}
              <div className="space-y-3 mt-6">
                <label className={`text-sm font-bold block ${theme === 'dark' ? 'text-neutral-300' : 'text-slate-700'}`}>Select Target Genres</label>
                <div className="flex flex-wrap gap-2 max-h-[145px] overflow-y-auto pr-1 scrollbar-thin">
                  {availableGenres.length === 0 ? (
                    Array(8).fill(0).map((_, i) => (
                      <div key={i} className={`h-8 w-20 animate-pulse rounded-full ${theme === 'dark' ? 'bg-neutral-800' : 'bg-slate-200'}`} />
                    ))
                  ) : (
                    availableGenres.map(genre => {
                      const isSelected = selectedGenres.includes(genre);
                      return (
                        <button
                          key={genre}
                          onClick={() => toggleSelection(genre, selectedGenres, setSelectedGenres)}
                          className={`px-4 py-2 rounded-full text-xs font-semibold border transition-all duration-300 ${
                            isSelected 
                              ? 'bg-gradient-to-r from-indigo-500 to-purple-500 border-indigo-400 text-white shadow-lg shadow-indigo-500/20 scale-105' 
                              : (theme === 'dark' ? 'bg-black/40 text-neutral-400 border-white/5 hover:border-white/20 hover:text-white' : 'bg-slate-100 text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-900')
                          }`}
                        >
                          {genre}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Dynamic Stars */}
              <div className="space-y-3 mt-6">
                <label className={`text-sm font-bold block ${theme === 'dark' ? 'text-neutral-300' : 'text-slate-700'}`}>Select Preferred Talents / Actors</label>
                <div className="flex flex-wrap gap-2 max-h-[145px] overflow-y-auto pr-1 scrollbar-thin">
                  {availableStars.length === 0 ? (
                    Array(8).fill(0).map((_, i) => (
                      <div key={i} className={`h-8 w-24 animate-pulse rounded-full ${theme === 'dark' ? 'bg-neutral-800' : 'bg-slate-200'}`} />
                    ))
                  ) : (
                    availableStars.map(star => {
                      const isSelected = selectedStars.includes(star);
                      return (
                        <button
                          key={star}
                          onClick={() => toggleSelection(star, selectedStars, setSelectedStars)}
                          className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all duration-300 ${
                            isSelected 
                              ? 'bg-gradient-to-r from-purple-500 to-pink-500 border-purple-400 text-white shadow-lg shadow-purple-500/20 scale-105' 
                              : (theme === 'dark' ? 'bg-black/40 text-neutral-400 border-white/5 hover:border-white/20 hover:text-white' : 'bg-slate-100 text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-900')
                          }`}
                        >
                          {star}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-6">
                <button
                  onClick={handleResetPreferences}
                  className={`flex-1 py-4 rounded-2xl font-bold text-sm transition-all duration-300 border ${
                    theme === 'dark' ? 'bg-white/5 border-white/5 hover:bg-white/10 text-neutral-300' : 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  Reset
                </button>
                <button
                  onClick={getAIMatchRecommendations}
                  disabled={selectedGenres.length === 0 && selectedStars.length === 0 && !textPrompt || loading}
                  className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2 hover:bg-indigo-700 active:scale-[0.98] transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed group shadow-lg shadow-indigo-500/15"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      Vectorizing...
                    </>
                  ) : (
                    <>
                      Get Recommendations
                      <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Results Column */}
            <div className="lg:col-span-7">
              <AnimatePresence mode="wait">
                {hasSearched ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-6"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Award className="text-indigo-400" />
                        <h2 className="text-2xl font-bold">Matching Movies</h2>
                      </div>
                      <span className={`text-xs border px-4 py-1.5 rounded-full font-bold transition-all duration-300 ${
                        theme === 'dark' ? 'text-neutral-400 bg-neutral-900 border-white/10' : 'text-slate-600 bg-white border-slate-200 shadow-sm'
                      }`}>
                        Found {recommendations.length} high-rank targets
                      </span>
                    </div>

                    {loading ? (
                      <div className="grid sm:grid-cols-2 gap-6">
                        {Array(6).fill(0).map((_, i) => <ShimmerCard key={i} theme={theme} />)}
                      </div>
                    ) : recommendations.length > 0 ? (
                      <div className="grid sm:grid-cols-2 gap-6">
                        {recommendations.map((rec, index) => (
                          <MovieCard 
                            key={rec.movie} 
                            movie={rec} 
                            index={index} 
                            onOpenDetails={setActiveDetailMovie} 
                            theme={theme}
                          />
                        ))}
                      </div>
                    ) : (
                      <EmptyResults theme={theme} />
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`h-full min-h-[500px] flex items-center justify-center rounded-3xl border border-dashed p-8 transition-colors duration-300 ${
                      theme === 'dark' ? 'bg-neutral-900/10 border-white/5' : 'bg-slate-100/50 border-slate-300/60'
                    }`}
                  >
                    <div className="text-center max-w-md">
                      <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl border border-indigo-500/10">
                        <Sparkles className="text-indigo-400 w-10 h-10 animate-pulse" />
                      </div>
                      <h3 className="text-2xl font-bold mb-3">AI Recommender Ready</h3>
                      <p className={`text-sm leading-relaxed mb-6 ${theme === 'dark' ? 'text-neutral-400' : 'text-slate-500'}`}>
                        Populate your preferences on the left side configuration panel and let the system compute the cosine similarity distances across the IMDb database.
                      </p>
                      <button 
                        onClick={() => {
                          setSelectedGenres(["Sci-Fi", "Adventure"]);
                          setSelectedStars(["Matthew McConaughey", "Leonardo DiCaprio"]);
                          setTextPrompt("mind-bending physics space voyage");
                        }}
                        className="text-xs font-bold text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 px-4 py-2.5 rounded-full border border-indigo-500/20 transition-all duration-300"
                      >
                        Load Awesome Demo Inputs
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>
        )}

        {/* Active Tab: Personalized Taste Profile */}
        {activeTab === 'profile' && (
          <div className="grid lg:grid-cols-12 gap-12 items-start">
            
            {/* Interactive Taste Seed Profile Selector */}
            <div className={`lg:col-span-5 p-8 rounded-3xl border transition-all duration-300 shadow-2xl backdrop-blur-xl ${
              theme === 'dark' ? 'bg-neutral-900/40 border-white/10 shadow-black/50' : 'bg-white border-slate-200/80 shadow-slate-100'
            }`}>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-widest">
                  <Heart size={14} />
                  <span>Interactive Taste Seeds</span>
                </div>
                <h2 className="text-3xl font-extrabold tracking-tight">Taste Profile Builder</h2>
                <p className={`text-sm leading-relaxed ${theme === 'dark' ? 'text-neutral-400' : 'text-slate-500'}`}>
                  Search and "Like" films you love. Our system will average their latent TF-IDF features to construct a personalized embedding vector.
                </p>
              </div>

              {/* Real-time search with suggestion dropdown */}
              <div className="space-y-3 relative mt-6" ref={searchContainerRef}>
                <label className={`text-sm font-bold ${theme === 'dark' ? 'text-neutral-300' : 'text-slate-700'}`}>Add Films You've Enjoyed</label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setShowSuggestions(true); }}
                    onFocus={() => setShowSuggestions(true)}
                    placeholder="Search titles (e.g. Inception, Shawshank...)"
                    className={`w-full rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none transition-all duration-300 ${
                      theme === 'dark' 
                        ? 'bg-black/60 border-white/10 text-white placeholder-neutral-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30' 
                        : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20'
                    }`}
                  />
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
                  
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                {/* Suggestions list dropdown */}
                <AnimatePresence>
                  {showSuggestions && searchSuggestions.length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className={`absolute left-0 right-0 top-[105%] border rounded-2xl overflow-hidden shadow-2xl z-50 max-h-[300px] overflow-y-auto scrollbar-thin transition-colors duration-300 ${
                        theme === 'dark' ? 'bg-neutral-900 border-white/10' : 'bg-white border-slate-200'
                      }`}
                    >
                      {searchSuggestions.map(movie => (
                        <div 
                          key={movie.title}
                          onClick={() => handleLikeMovie(movie)}
                          className={`flex items-center gap-4 px-4 py-3 cursor-pointer transition-colors border-b last:border-0 ${
                            theme === 'dark' ? 'hover:bg-white/5 border-white/5' : 'hover:bg-slate-50 border-slate-100'
                          }`}
                        >
                          <img src={movie.poster} alt={movie.title} referrerPolicy="no-referrer" className="w-10 h-14 object-cover rounded-md flex-shrink-0" />
                          <div className="flex-grow min-w-0">
                            <h4 className={`text-sm font-bold truncate ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{movie.title}</h4>
                            <div className="flex items-center gap-2 text-xs text-neutral-400 mt-1">
                              <span>{movie.year}</span>
                              <span>•</span>
                              <span className="truncate max-w-[150px]">{movie.genre}</span>
                            </div>
                          </div>
                          <div className="text-xs bg-indigo-500/10 text-indigo-400 px-2.5 py-1 rounded-full border border-indigo-500/20 font-bold flex items-center gap-1">
                            <Plus size={12} /> Add
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Seed / Liked List Display */}
              <div className="space-y-3 mt-6">
                <label className={`text-sm font-bold flex justify-between ${theme === 'dark' ? 'text-neutral-300' : 'text-slate-700'}`}>
                  <span>Your Taste Seeds ({likedMovies.length})</span>
                  {likedMovies.length > 0 && (
                    <button 
                      onClick={() => { setLikedMovies([]); setRecommendations([]); setHasSearched(false); }}
                      className="text-xs text-neutral-500 hover:text-red-400 flex items-center gap-1 transition-colors"
                    >
                      <Trash2 size={12} /> Clear all
                    </button>
                  )}
                </label>

                {likedMovies.length === 0 ? (
                  <div className={`border border-dashed rounded-2xl p-6 text-center text-xs ${
                    theme === 'dark' ? 'bg-black/20 border-white/5 text-neutral-500' : 'bg-slate-50 border-slate-200 text-slate-400'
                  }`}>
                    No movies liked yet. Search and add movies above to initialize recommendations.
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin">
                    {likedMovies.map(title => (
                      <span 
                        key={title}
                        className="inline-flex items-center gap-2 bg-indigo-500/10 text-indigo-400 px-4 py-2 rounded-full border border-indigo-500/20 text-xs font-semibold shadow-inner"
                      >
                        <Film size={12} />
                        {title}
                        <button 
                          onClick={() => handleRemoveLiked(title)}
                          className="hover:text-red-400 text-neutral-400 transition-colors ml-1 p-0.5 rounded-full hover:bg-white/5"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {likedMovies.length > 0 && (
                <button
                  onClick={() => getProfileRecommendations()}
                  className="w-full bg-white text-black py-4 rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2 hover:bg-neutral-200 active:scale-[0.98] transition-all duration-300 border border-slate-200 mt-6"
                >
                  <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                  Recalculate Fit Coordinates
                </button>
              )}
            </div>

            {/* Recommendations Output */}
            <div className="lg:col-span-7">
              <AnimatePresence mode="wait">
                {hasSearched ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-6"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Award className="text-indigo-400" />
                        <h2 className="text-2xl font-bold">Personalized Matches</h2>
                      </div>
                      <span className={`text-xs border px-4 py-1.5 rounded-full font-bold transition-all duration-300 ${
                        theme === 'dark' ? 'text-neutral-400 bg-neutral-900 border-white/10' : 'text-slate-600 bg-white border-slate-200 shadow-sm'
                      }`}>
                        Profile embedding active
                      </span>
                    </div>

                    {loading ? (
                      <div className="grid sm:grid-cols-2 gap-6">
                        {Array(6).fill(0).map((_, i) => <ShimmerCard key={i} theme={theme} />)}
                      </div>
                    ) : recommendations.length > 0 ? (
                      <div className="grid sm:grid-cols-2 gap-6">
                        {recommendations.map((rec, index) => (
                          <MovieCard 
                            key={rec.movie} 
                            movie={rec} 
                            index={index} 
                            onOpenDetails={setActiveDetailMovie} 
                            theme={theme}
                          />
                        ))}
                      </div>
                    ) : (
                      <EmptyResults theme={theme} />
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`h-full min-h-[500px] flex items-center justify-center rounded-3xl border border-dashed p-8 transition-colors duration-300 ${
                      theme === 'dark' ? 'bg-neutral-900/10 border-white/5' : 'bg-slate-100/50 border-slate-300/60'
                    }`}
                  >
                    <div className="text-center max-w-md">
                      <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl border border-indigo-500/10">
                        <Heart className="text-indigo-400 w-10 h-10 animate-pulse fill-indigo-400/20" />
                      </div>
                      <h3 className="text-2xl font-bold mb-3">Profile Vector Empty</h3>
                      <p className={`text-sm leading-relaxed mb-6 ${theme === 'dark' ? 'text-neutral-400' : 'text-slate-500'}`}>
                        Input 1 or more films you like in the left hand profile builder. Our engine will synthesize their text matrices and auto-generate related recommendations instantly.
                      </p>
                      <button 
                        onClick={() => {
                          const demoLiked = ["Interstellar", "Inception"];
                          setLikedMovies(demoLiked);
                          getProfileRecommendations(demoLiked);
                        }}
                        className="text-xs font-bold text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 px-4 py-2.5 rounded-full border border-indigo-500/20 transition-all duration-300"
                      >
                        Load Interstellar + Inception
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>
        )}

        {/* Active Tab: Trending Charts */}
        {activeTab === 'trending' && (
          <div className="space-y-8">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 mb-3 text-xs font-bold text-indigo-400 uppercase tracking-widest">
                <Award size={14} />
                <span>IMDb Standard Quality Model</span>
              </div>
              <h2 className="text-4xl font-black">IMDb Weighted Quality Charts</h2>
              <p className={`text-sm mt-2 leading-relaxed ${theme === 'dark' ? 'text-neutral-400' : 'text-slate-500'}`}>
                Ranks movies mathematically based on the official IMDb weighted score formula to filter out random ratings with insufficient votes, keeping only premium blockbuster and artistic classics.
              </p>
            </div>

            {trendingMovies.length === 0 ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {Array(8).fill(0).map((_, i) => <ShimmerCard key={i} theme={theme} />)}
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {trendingMovies.map((rec, index) => (
                  <MovieCard 
                    key={rec.movie} 
                    movie={rec} 
                    index={index} 
                    onOpenDetails={setActiveDetailMovie} 
                    theme={theme}
                  />
                ))}
              </div>
            )}
          </div>
        )}

      </main>

      {/* Details Modal overlay */}
      <AnimatePresence>
        {activeDetailMovie && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md overflow-y-auto ${
              theme === 'dark' ? 'bg-black/85' : 'bg-slate-900/60'
            }`}
            onClick={() => setActiveDetailMovie(null)}
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className={`border rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl relative transition-all duration-300 ${
                theme === 'dark' ? 'bg-neutral-900 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button 
                onClick={() => setActiveDetailMovie(null)}
                className={`absolute right-6 top-6 z-10 w-10 h-10 rounded-full flex items-center justify-center transition-colors border ${
                  theme === 'dark' ? 'bg-black/60 text-white hover:bg-neutral-800 border-white/10' : 'bg-slate-100 text-slate-800 hover:bg-slate-200 border-slate-200'
                }`}
              >
                <X size={20} />
              </button>

              <div className="grid md:grid-cols-12 gap-8 p-6 md:p-8">
                
                {/* Poster Cover Column */}
                <div className="md:col-span-4 relative rounded-2xl overflow-hidden bg-neutral-950 aspect-[2/3] md:aspect-auto md:h-full min-h-[300px]">
                  {/* Blurred background layer to prevent black side bars */}
                  <img 
                    src={activeDetailMovie.poster} 
                    alt="" 
                    referrerPolicy="no-referrer"
                    className="absolute inset-0 w-full h-full object-cover filter blur-xl opacity-30 scale-110 pointer-events-none"
                  />
                  {/* Clean foreground layer - 100% uncropped poster */}
                  <img 
                    src={activeDetailMovie.poster} 
                    alt={activeDetailMovie.movie} 
                    referrerPolicy="no-referrer"
                    className="absolute inset-0 w-full h-full object-contain p-2 z-10 shadow-2xl"
                  />
                  
                  {/* Score circle floating on cover */}
                  <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-md border border-indigo-400 px-4 py-2 rounded-xl text-xs font-black tracking-wider flex items-center gap-1.5 text-white">
                    <Sparkles size={12} className="text-indigo-400" />
                    <span>{activeDetailMovie.score}% FIT</span>
                  </div>
                </div>

                {/* Details Column */}
                <div className="md:col-span-8 flex flex-col justify-between space-y-6">
                  
                  <div className="space-y-4">
                    {/* Header info */}
                    <div className="space-y-1.5 pr-8">
                      <div className="flex flex-wrap gap-2">
                        {activeDetailMovie.genre.split(',').map(g => (
                          <span key={g} className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-md border border-indigo-500/20">
                            {g.trim()}
                          </span>
                        ))}
                      </div>
                      <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight leading-tight">{activeDetailMovie.movie}</h2>
                    </div>

                    {/* Specifications line */}
                    <div className={`flex flex-wrap items-center gap-4 text-xs font-semibold px-4 py-3 rounded-2xl border w-fit ${
                      theme === 'dark' ? 'text-neutral-400 bg-white/5 border-white/5' : 'text-slate-600 bg-slate-100 border-slate-200'
                    }`}>
                      <span className="flex items-center gap-1"><Calendar size={14} /> {activeDetailMovie.year}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1"><Clock size={14} /> {activeDetailMovie.runtime}</span>
                      <span>•</span>
                      <span className="bg-neutral-800 px-2 py-0.5 rounded text-[10px] uppercase font-black text-white">{activeDetailMovie.certificate}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-yellow-400"><Star size={14} className="fill-yellow-400" /> {activeDetailMovie.rating} IMDb</span>
                    </div>

                    {/* Plot synopsis */}
                    <div className="space-y-2">
                      <h4 className={`text-xs font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-neutral-400' : 'text-slate-500'}`}>Synopsis</h4>
                      <p className={`text-sm leading-relaxed font-normal ${theme === 'dark' ? 'text-neutral-300' : 'text-slate-600'}`}>
                        {activeDetailMovie.overview}
                      </p>
                    </div>

                    {/* Credits list */}
                    <div className="grid sm:grid-cols-2 gap-4 pt-2">
                      <div>
                        <span className={`text-xs font-bold uppercase tracking-widest block mb-1 ${theme === 'dark' ? 'text-neutral-400' : 'text-slate-500'}`}>Director</span>
                        <span className="text-sm font-semibold">{activeDetailMovie.director}</span>
                      </div>
                      <div>
                        <span className={`text-xs font-bold uppercase tracking-widest block mb-1 ${theme === 'dark' ? 'text-neutral-400' : 'text-slate-500'}`}>Star Cast</span>
                        <span className="text-sm font-semibold truncate block">
                          {activeDetailMovie.stars.join(', ')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions sheet */}
                  <div className={`flex flex-wrap gap-4 pt-4 border-t ${theme === 'dark' ? 'border-white/10' : 'border-slate-200'}`}>
                    <button
                      onClick={() => {
                        handleLikeMovie({ title: activeDetailMovie.movie, poster: activeDetailMovie.poster, year: activeDetailMovie.year, genre: activeDetailMovie.genre });
                        setActiveDetailMovie(null);
                        setActiveTab('profile');
                      }}
                      className={`flex-1 font-bold py-3.5 px-6 rounded-2xl flex items-center justify-center gap-2 transition-all duration-300 text-sm border ${
                        theme === 'dark' ? 'bg-white/5 hover:bg-white/10 border-white/10 text-white' : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-800'
                      }`}
                    >
                      <Heart size={16} className="text-indigo-400 fill-indigo-400/20" />
                      Add to Taste Profile
                    </button>
                    <button
                      onClick={() => getSimilarRecommendations(activeDetailMovie.movie)}
                      className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-extrabold py-3.5 px-6 rounded-2xl flex items-center justify-center gap-2 transition-all duration-300 shadow-lg shadow-indigo-500/25 text-sm"
                    >
                      <Sparkles size={16} />
                      Recommend Similar Movies
                    </button>
                  </div>

                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Authentication Modal */}
      <AnimatePresence>
        {isAuthModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            onClick={() => setIsAuthModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className={`border rounded-3xl w-full max-w-md p-8 shadow-2xl relative transition-all duration-300 ${
                theme === 'dark' ? 'bg-neutral-900 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close */}
              <button
                onClick={() => setIsAuthModalOpen(false)}
                className={`absolute right-6 top-6 w-8 h-8 rounded-full flex items-center justify-center transition-colors border ${
                  theme === 'dark' ? 'bg-black/40 text-white hover:bg-neutral-800 border-white/5' : 'bg-slate-100 text-slate-800 hover:bg-slate-200 border-slate-200'
                }`}
              >
                <X size={16} />
              </button>

              <div className="space-y-6">
                <div className="text-center space-y-1">
                  <h3 className="text-2xl font-black tracking-tight">
                    {isSignUp ? 'Create an Account' : 'Welcome Back'}
                  </h3>
                  <p className={`text-xs font-medium ${theme === 'dark' ? 'text-neutral-400' : 'text-slate-500'}`}>
                    {isSignUp ? 'Enter your details to register on CineMatch AI' : 'Sign in to access your taste coordinates'}
                  </p>
                </div>

                {authError && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs font-semibold text-center">
                    {authError}
                  </div>
                )}

                <form onSubmit={handleAuthSubmit} className="space-y-4">
                  {isSignUp && (
                    <div className="space-y-1.5">
                      <label className={`text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-neutral-400' : 'text-slate-500'}`}>Full Name</label>
                      <input
                        type="text"
                        required
                        value={authName}
                        onChange={(e) => setAuthName(e.target.value)}
                        placeholder="e.g. John Doe"
                        className={`w-full rounded-xl py-3 px-4 text-sm focus:outline-none transition-all duration-300 ${
                          theme === 'dark' ? 'bg-black/60 border-white/10 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'
                        }`}
                      />
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className={`text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-neutral-400' : 'text-slate-500'}`}>Email Address</label>
                    <input
                      type="email"
                      required
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      placeholder="e.g. john@example.com"
                      className={`w-full rounded-xl py-3 px-4 text-sm focus:outline-none transition-all duration-300 ${
                        theme === 'dark' ? 'bg-black/60 border-white/10 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'
                      }`}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className={`text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-neutral-400' : 'text-slate-500'}`}>Password</label>
                    <input
                      type="password"
                      required
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      placeholder="••••••••"
                      className={`w-full rounded-xl py-3 px-4 text-sm focus:outline-none transition-all duration-300 ${
                        theme === 'dark' ? 'bg-black/60 border-white/10 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'
                      }`}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isAuthLoading}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 mt-4 active:scale-[0.98] shadow-lg shadow-indigo-500/20 disabled:opacity-50"
                  >
                    {isAuthLoading ? (
                      <>
                        <Loader2 className="animate-spin" size={16} />
                        Processing...
                      </>
                    ) : (
                      <>{isSignUp ? 'Sign Up' : 'Log In'}</>
                    )}
                  </button>
                </form>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => { setIsSignUp(!isSignUp); setAuthError(''); }}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-bold transition-colors"
                  >
                    {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Create One"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast.show && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-6 py-4 rounded-2xl border shadow-2xl ${
              theme === 'dark'
                ? 'bg-neutral-900 border-indigo-500/30 text-white shadow-indigo-500/5'
                : 'bg-white border-slate-200 text-slate-900 shadow-slate-200'
            }`}
          >
            <div className="bg-emerald-500/10 p-1.5 rounded-full text-emerald-400 border border-emerald-500/20">
              <Check size={16} />
            </div>
            <span className="text-xs font-semibold">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Footer */}
      <footer className={`border-t py-12 relative z-10 text-center text-xs transition-colors duration-300 ${
        theme === 'dark' ? 'border-white/5 bg-black/85 text-neutral-600' : 'border-slate-200 bg-slate-100 text-slate-500'
      }`}>
        <div className="max-w-7xl mx-auto px-6 space-y-4">
          <p>© 2026 CineMatch AI Enterprise Recommendation Engine. Powered by Collaborative & Content-Based Vector Kernels.</p>
          <div className={`flex justify-center gap-6 ${theme === 'dark' ? 'text-neutral-400' : 'text-slate-600'}`}>
            <span className="hover:text-indigo-400 transition-colors cursor-pointer">TF-IDF Vectorizer</span>
            <span>•</span>
            <span className="hover:text-indigo-400 transition-colors cursor-pointer">Cosine Similarity Matrix</span>
            <span>•</span>
            <span className="hover:text-indigo-400 transition-colors cursor-pointer">IMDb Rating Formula</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* Helper Cards Components */

function MovieCard({ movie, index, onOpenDetails, theme }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      whileHover={{ y: -6, transition: { duration: 0.2 } }}
      className={`group relative border rounded-3xl overflow-hidden shadow-lg flex flex-col cursor-pointer transition-all duration-300 ${
        theme === 'dark'
          ? 'bg-neutral-900/40 border-white/5 hover:bg-neutral-900/80 hover:border-indigo-500/30'
          : 'bg-white border-slate-200/80 hover:bg-slate-50 hover:border-indigo-500/20'
      }`}
      onClick={() => onOpenDetails(movie)}
    >
      {/* Poster area */}
      <div className="aspect-[2/3] overflow-hidden bg-neutral-950 relative w-full border-b border-transparent">
        {/* Blurred background layer to prevent black side bars */}
        <img 
          src={movie.poster} 
          alt="" 
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover filter blur-xl opacity-30 scale-110 pointer-events-none"
        />
        {/* Clean foreground layer - 100% uncropped poster */}
        <img 
          src={movie.poster} 
          alt={movie.movie}
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-contain p-2 z-10 transition-transform duration-700 group-hover:scale-105"
          onError={(e) => {
            e.target.src = "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?q=80&w=600&auto=format&fit=crop";
          }}
        />
        
        {/* Score circular floating marker */}
        <div className="absolute top-3 right-3 bg-black/75 backdrop-blur-md border border-emerald-500/30 px-2.5 py-1 rounded-lg text-[9px] font-black text-emerald-400 tracking-wider flex items-center gap-1 shadow-md z-20">
          <Sparkles size={10} className="fill-emerald-400/20" />
          <span>{movie.score}% MATCH</span>
        </div>
      </div>

      {/* Card Info details */}
      <div className="p-5 flex-grow flex flex-col justify-between space-y-4">
        <div className="space-y-2.5">
          <h3 className={`font-extrabold text-lg line-clamp-1 group-hover:text-indigo-400 transition-colors ${
            theme === 'dark' ? 'text-white' : 'text-slate-900'
          }`}>{movie.movie}</h3>
          
          <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500 font-semibold">
            <span>{movie.year}</span>
            <span>•</span>
            <span className="flex items-center gap-0.5 text-yellow-500"><Star size={12} className="fill-yellow-500" /> {movie.rating}</span>
            <span>•</span>
            <span className="flex items-center gap-1"><Clock size={12} /> {movie.runtime.split(' ')[0]} min</span>
          </div>

          {/* Category tags moved here under the title to keep the poster 100% clean */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {movie.genre.split(',').slice(0, 2).map(g => (
              <span key={g} className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${
                theme === 'dark'
                  ? 'text-neutral-300 bg-white/5 border-white/10'
                  : 'text-slate-700 bg-slate-100 border-slate-200'
              }`}>
                {g.trim()}
              </span>
            ))}
          </div>
        </div>

        <p className={`text-xs font-normal leading-relaxed line-clamp-2 ${
          theme === 'dark' ? 'text-neutral-400' : 'text-slate-500'
        }`}>
          {movie.overview}
        </p>

        <div className={`pt-2 flex items-center justify-between text-xs border-t text-neutral-500 ${
          theme === 'dark' ? 'border-white/5' : 'border-slate-100'
        }`}>
          <span className="truncate max-w-[150px]">By <b>{movie.director}</b></span>
          <span className="text-indigo-400 font-bold group-hover:translate-x-1 transition-transform flex items-center gap-1">
            Explore Details <Eye size={12} />
          </span>
        </div>
      </div>
      
      {/* Bottom matching slide line */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-neutral-800 overflow-hidden">
        <div className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500" style={{ width: `${movie.score}%` }} />
      </div>
    </motion.div>
  );
}

function ShimmerCard({ theme }) {
  return (
    <div className={`border rounded-3xl overflow-hidden p-4 space-y-4 animate-pulse ${
      theme === 'dark' ? 'bg-neutral-900/30 border-white/5' : 'bg-slate-100 border-slate-200'
    }`}>
      <div className={`aspect-[2/3] rounded-2xl w-full ${theme === 'dark' ? 'bg-neutral-800' : 'bg-slate-200'}`} />
      <div className={`h-5 rounded-md w-3/4 ${theme === 'dark' ? 'bg-neutral-800' : 'bg-slate-200'}`} />
      <div className={`h-3 rounded-md w-1/2 ${theme === 'dark' ? 'bg-neutral-800' : 'bg-slate-200'}`} />
      <div className={`h-10 rounded-md w-full ${theme === 'dark' ? 'bg-neutral-800' : 'bg-slate-200'}`} />
    </div>
  );
}

function EmptyResults({ theme }) {
  return (
    <div className={`p-16 rounded-3xl border text-center flex flex-col items-center shadow-lg transition-colors duration-300 ${
      theme === 'dark' ? 'bg-neutral-900/40 border-white/5' : 'bg-white border-slate-200 shadow-slate-100'
    }`}>
      <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 border ${
        theme === 'dark' ? 'bg-neutral-800 border-white/5 text-neutral-500' : 'bg-slate-100 border-slate-200 text-slate-400'
      }`}>
        ?
      </div>
      <h3 className="text-xl font-bold mb-2">No High Matching Targets Found</h3>
      <p className={`text-sm max-w-sm ${theme === 'dark' ? 'text-neutral-400' : 'text-slate-500'}`}>
        Try checking additional keywords, switching genre toggles, or adding alternative titles in your taste configuration profile.
      </p>
    </div>
  );
}
