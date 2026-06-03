import WeatherIcon from './WeatherIcon';

const Forecast = ({ forecast }) => {
  if (!forecast || forecast.length === 0) return null;

  return (
    <div className="forecast">
      <h3 className="forecast-title">未来15天预报</h3>
      <div className="forecast-list">
        {forecast.map((day, index) => (
          <div key={index} className="forecast-item">
            <span className="forecast-date">{day.date}</span>
            <WeatherIcon type={day.icon} size="small" />
            <span className="forecast-condition">{day.condition}</span>
            <div className="forecast-temps">
              <span className="temp-high">{day.high}°</span>
              <span className="temp-divider">/</span>
              <span className="temp-low">{day.low}°</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Forecast;
