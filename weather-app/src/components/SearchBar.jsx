import { useState, useEffect } from 'react';

const RECENT_CITIES_KEY = 'weather_recent_cities';
const MAX_RECENT_CITIES = 5;

const SearchBar = ({ onSearch, recentCities, onRecentCityClick }) => {
  const [city, setCity] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (city.trim()) {
      onSearch(city.trim());
      setCity('');
    }
  };

  return (
    <div className="search-container">
      <form className="search-bar" onSubmit={handleSubmit}>
        <input
          type="text"
          className="search-input"
          placeholder="输入城市名称（支持全国市县级行政区）"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />
        <button type="submit" className="search-button">
          查询
        </button>
      </form>
      
      {recentCities && recentCities.length > 0 && (
        <div className="recent-cities">
          <span className="recent-label">最近搜索：</span>
          {recentCities.map((recentCity, index) => (
            <button
              key={index}
              className="recent-city-btn"
              onClick={() => onRecentCityClick(recentCity)}
            >
              {recentCity}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
