import { useState, useEffect } from 'react';
import * as Location from 'expo-location';

export default function useLocation() {
  const [location, setLocation] = useState('Locating...');
  const [coords, setCoords] = useState(null);

  useEffect(() => {
    const getLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocation('Location denied');
          return;
        }
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const { latitude, longitude } = loc.coords;
        setCoords({ lat: latitude, lng: longitude });
        const geo = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (geo && geo.length > 0) {
          const place = geo[0];
          setLocation(place.district || place.subregion || place.city || place.region || 'Your location');
        }
      } catch (e) {
        setLocation('Location unavailable');
      }
    };
    getLocation();
  }, []);

  return { location, coords };
}
