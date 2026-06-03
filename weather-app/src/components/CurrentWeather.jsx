import WeatherIcon from './WeatherIcon';

const CurrentWeather = ({ data }) => {
  if (!data) return null;

  const { city, country, current } = data;

  return (
    <div className="current-weather">
      <div className="weather-header">
        <h2 className="city-name">{city}, {country}</h2>
        <p className="weather-condition">{current.condition}</p>
      </div>
      <div className="weather-main">
        <WeatherIcon type={current.icon} size="large" />
        <div className="temp-info">
          <span className="temperature">{current.temp}°C</span>
          <p className="feels-like">体感温度 {current.feelsLike}°C</p>
        </div>
      </div>
      <div className="weather-details">
        <div className="detail-item">
          <span className="detail-label">湿度</span>
          <span className="detail-value">{current.humidity}%</span>
        </div>
        <div className="detail-item">
          <span className="detail-label">风速</span>
          <span className="detail-value">{current.windSpeed} km/h</span>
        </div>
      </div>
    </div>
  );
};

export default CurrentWeather;
