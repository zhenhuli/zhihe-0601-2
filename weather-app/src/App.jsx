import { useState, useEffect } from 'react';
import SearchBar from './components/SearchBar';
import CurrentWeather from './components/CurrentWeather';
import Forecast from './components/Forecast';
import Loading from './components/Loading';
import fetchWeather from './api/mockWeatherAPI';
import './App.css';

const RECENT_CITIES_KEY = 'weather_recent_cities';
const MAX_RECENT_CITIES = 5;

function App() {
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [recentCities, setRecentCities] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem(RECENT_CITIES_KEY);
    if (saved) {
      try {
        setRecentCities(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse recent cities:', e);
      }
    }
  }, []);

  const saveRecentCity = (city) => {
    setRecentCities(prev => {
      const filtered = prev.filter(c => c !== city);
      const updated = [city, ...filtered].slice(0, MAX_RECENT_CITIES);
      localStorage.setItem(RECENT_CITIES_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const handleSearch = async (city) => {
    setLoading(true);
    setError(null);
    setWeatherData(null);
    
    try {
      const data = await fetchWeather(city);
      setWeatherData(data);
      saveRecentCity(data.city);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRecentCityClick = (city) => {
    handleSearch(city);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>🌤️ 天气查询</h1>
        <p>Weather Forecast App</p>
      </header>
      
      <main className="app-main">
        <SearchBar 
          onSearch={handleSearch} 
          recentCities={recentCities}
          onRecentCityClick={handleRecentCityClick}
        />
        
        {loading && <Loading />}
        
        {error && (
          <div className="error-message">
            <p>⚠️ {error.split('\n').map((line, i) => (
              <span key={i}>
                {line}
                {i < error.split('\n').length - 1 && <br />}
              </span>
            ))}</p>
          </div>
        )}
        
        {!loading && !error && weatherData && (
          <div className="weather-container">
            <CurrentWeather data={weatherData} />
            <Forecast forecast={weatherData.forecast} />
          </div>
        )}
        
        {!loading && !error && !weatherData && (
          <div className="welcome-message">
            <p>👋 欢迎使用天气查询应用</p>
            <p>请在上方输入城市名称开始查询</p>
            <p className="hint">支持全国所有市县级行政区</p>
          </div>
        )}
      </main>
      
      <footer className="app-footer">
        <p>模拟天气数据服务 | 后续可无缝切换至 OpenWeatherMap 等真实 API</p>
      </footer>
    </div>
  );
}

export default App;
