const WeatherIcon = ({ type, size = 'medium' }) => {
  const sizeClass = size === 'small' ? 'icon-small' : size === 'large' ? 'icon-large' : 'icon-medium';
  
  const icons = {
    sunny: (
      <svg className={`weather-icon ${sizeClass}`} viewBox="0 0 100 100" fill="none">
        <circle cx="50" cy="50" r="20" fill="#FFD93D" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
          <line
            key={i}
            x1={50 + 28 * Math.cos((angle * Math.PI) / 180)}
            y1={50 + 28 * Math.sin((angle * Math.PI) / 180)}
            x2={50 + 38 * Math.cos((angle * Math.PI) / 180)}
            y2={50 + 38 * Math.sin((angle * Math.PI) / 180)}
            stroke="#FFD93D"
            strokeWidth="4"
            strokeLinecap="round"
          />
        ))}
      </svg>
    ),
    cloudy: (
      <svg className={`weather-icon ${sizeClass}`} viewBox="0 0 100 100" fill="none">
        <circle cx="35" cy="55" r="15" fill="#B0B0B0" />
        <circle cx="55" cy="50" r="20" fill="#C8C8C8" />
        <circle cx="75" cy="55" r="15" fill="#B0B0B0" />
        <ellipse cx="55" cy="65" rx="30" ry="10" fill="#C8C8C8" />
      </svg>
    ),
    rainy: (
      <svg className={`weather-icon ${sizeClass}`} viewBox="0 0 100 100" fill="none">
        <circle cx="35" cy="45" r="15" fill="#7A8BA3" />
        <circle cx="55" cy="40" r="20" fill="#8A9BB3" />
        <circle cx="75" cy="45" r="15" fill="#7A8BA3" />
        <ellipse cx="55" cy="55" rx="30" ry="10" fill="#8A9BB3" />
        <line x1="35" y1="70" x2="30" y2="85" stroke="#4A90E2" strokeWidth="3" strokeLinecap="round" />
        <line x1="50" y1="70" x2="45" y2="85" stroke="#4A90E2" strokeWidth="3" strokeLinecap="round" />
        <line x1="65" y1="70" x2="60" y2="85" stroke="#4A90E2" strokeWidth="3" strokeLinecap="round" />
        <line x1="55" y1="75" x2="50" y2="90" stroke="#4A90E2" strokeWidth="3" strokeLinecap="round" />
      </svg>
    ),
    overcast: (
      <svg className={`weather-icon ${sizeClass}`} viewBox="0 0 100 100" fill="none">
        <circle cx="30" cy="50" r="15" fill="#808080" />
        <circle cx="50" cy="45" r="22" fill="#909090" />
        <circle cx="75" cy="50" r="18" fill="#808080" />
        <ellipse cx="52" cy="62" rx="35" ry="12" fill="#909090" />
      </svg>
    )
  };

  return icons[type] || icons.sunny;
};

export default WeatherIcon;
