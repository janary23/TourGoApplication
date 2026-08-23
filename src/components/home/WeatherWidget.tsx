import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface WeatherWidgetProps {
  upcomingTrips: any[];
  homeCityName: string;
  colors: any;
  isDark: boolean;
}

interface CityWeather {
  city: string;
  temp: number;
  condition: string;
  conditionText: string;
  icon: string;
  humidity: number;
  windSpeed: number;
  uvIndex: string;
  forecast: Array<{
    day: string;
    tempMin: number;
    tempMax: number;
    condition: string;
    icon: string;
  }>;
}

export default function WeatherWidget({
  upcomingTrips,
  homeCityName,
  colors,
  isDark,
}: WeatherWidgetProps) {
  const [isWeatherExpanded, setIsWeatherExpanded] = useState(false);
  const [weatherTab, setWeatherTab] = useState<'home' | 'trip'>('trip');

  const getWeatherDataForCity = (cityName: string): CityWeather => {
    const norm = cityName.toLowerCase();
    if (norm.includes('baguio')) {
      return {
        city: "Baguio City",
        temp: 18,
        condition: 'rainy',
        conditionText: 'Cool & Showers',
        icon: 'rainy-outline',
        humidity: 90,
        windSpeed: 8,
        uvIndex: 'Low',
        forecast: [
          { day: 'Mon', tempMin: 15, tempMax: 20, condition: 'rainy', icon: 'rainy-outline' },
          { day: 'Tue', tempMin: 16, tempMax: 21, condition: 'cloudy', icon: 'cloudy-outline' },
          { day: 'Wed', tempMin: 15, tempMax: 20, condition: 'rainy', icon: 'rainy-outline' },
          { day: 'Thu', tempMin: 16, tempMax: 22, condition: 'cloudy', icon: 'partly-sunny-outline' },
          { day: 'Fri', tempMin: 15, tempMax: 21, condition: 'rainy', icon: 'rainy-outline' },
        ]
      };
    }
    if (norm.includes('siargao') || norm.includes('general luna')) {
      return {
        city: "Siargao",
        temp: 30,
        condition: 'sunny',
        conditionText: 'Sunny & Hot',
        icon: 'sunny-outline',
        humidity: 70,
        windSpeed: 15,
        uvIndex: 'Extreme',
        forecast: [
          { day: 'Mon', tempMin: 26, tempMax: 32, condition: 'sunny', icon: 'sunny-outline' },
          { day: 'Tue', tempMin: 25, tempMax: 31, condition: 'sunny', icon: 'sunny-outline' },
          { day: 'Wed', tempMin: 26, tempMax: 32, condition: 'sunny', icon: 'sunny-outline' },
          { day: 'Thu', tempMin: 25, tempMax: 30, condition: 'cloudy', icon: 'cloudy-outline' },
          { day: 'Fri', tempMin: 25, tempMax: 31, condition: 'sunny', icon: 'sunny-outline' },
        ]
      };
    }
    if (norm.includes('bohol') || norm.includes('panglao')) {
      return {
        city: "Bohol",
        temp: 29,
        condition: 'sunny',
        conditionText: 'Clear Skies',
        icon: 'sunny-outline',
        humidity: 75,
        windSpeed: 10,
        uvIndex: 'Very High',
        forecast: [
          { day: 'Mon', tempMin: 24, tempMax: 30, condition: 'sunny', icon: 'sunny-outline' },
          { day: 'Tue', tempMin: 25, tempMax: 30, condition: 'sunny', icon: 'sunny-outline' },
          { day: 'Wed', tempMin: 25, tempMax: 29, condition: 'cloudy', icon: 'cloudy-outline' },
          { day: 'Thu', tempMin: 24, tempMax: 30, condition: 'sunny', icon: 'sunny-outline' },
          { day: 'Fri', tempMin: 25, tempMax: 31, condition: 'sunny', icon: 'sunny-outline' },
        ]
      };
    }
    return {
      city: "El Nido",
      temp: 28,
      condition: 'sunny',
      conditionText: 'Partly Sunny',
      icon: 'partly-sunny-outline',
      humidity: 72,
      windSpeed: 12,
      uvIndex: 'Very High',
      forecast: [
        { day: 'Mon', tempMin: 24, tempMax: 29, condition: 'sunny', icon: 'sunny-outline' },
        { day: 'Tue', tempMin: 25, tempMax: 30, condition: 'sunny', icon: 'sunny-outline' },
        { day: 'Wed', tempMin: 25, tempMax: 30, condition: 'sunny', icon: 'partly-sunny-outline' },
        { day: 'Thu', tempMin: 24, tempMax: 29, condition: 'cloudy', icon: 'cloudy-outline' },
        { day: 'Fri', tempMin: 25, tempMax: 30, condition: 'rainy', icon: 'rain-outline' },
      ]
    };
  };

  const getContextualWeather = () => {
    const nextTrip = upcomingTrips[0];
    if (nextTrip) {
      return {
        label: "trip weather",
        data: getWeatherDataForCity(nextTrip.destination)
      };
    }
    return {
      label: "home weather",
      data: getWeatherDataForCity(homeCityName || "Manila")
    };
  };

  const contextualWeather = getContextualWeather();
  const tripDestName = upcomingTrips[0] ? upcomingTrips[0].destination : "El Nido, Palawan";

  const weatherData: Record<'home' | 'trip', CityWeather> = {
    home: getWeatherDataForCity(homeCityName || "Manila"),
    trip: getWeatherDataForCity(tripDestName)
  };

  const activeWeather = weatherData[weatherTab];

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => {
          setWeatherTab(upcomingTrips.length > 0 ? 'trip' : 'home');
          setIsWeatherExpanded(true);
        }}
        style={[styles.weatherWidget, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
      >
        <Text style={[styles.weatherLabel, { color: isDark ? '#8E8E93' : '#6B7B8F' }]}>
          {contextualWeather.label}
        </Text>
        <Ionicons
          name={contextualWeather.data.icon as any}
          size={20}
          color={contextualWeather.data.condition === 'sunny' ? '#F59E0B' : (contextualWeather.data.condition === 'rainy' ? '#3B82F6' : '#9CA3AF')}
          style={styles.weatherIcon}
        />
        <Text style={[styles.weatherTemp, { color: isDark ? '#F5F5F5' : '#2A3C57' }]}>{contextualWeather.data.temp}°</Text>
        <Text style={[styles.weatherLocation, { color: isDark ? '#8E8E93' : '#6B7B8F' }]} numberOfLines={1}>
          {contextualWeather.data.city.split(',')[0].toLowerCase()}
        </Text>
      </TouchableOpacity>

      {/* Weather Details Modal */}
      <Modal
        visible={isWeatherExpanded}
        animationType="fade"
        transparent
        onRequestClose={() => setIsWeatherExpanded(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setIsWeatherExpanded(false)}
        >
          <TouchableOpacity activeOpacity={1} style={[styles.weatherExpandedCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.expandedHeader}>
              <Text style={[styles.expandedTitle, { color: colors.text }]}>Destination Weather</Text>
              <TouchableOpacity onPress={() => setIsWeatherExpanded(false)} style={{ padding: 4 }}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Tabs */}
            <View style={[styles.weatherTabContainer, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
              <TouchableOpacity
                onPress={() => setWeatherTab('home')}
                style={[
                  styles.weatherTabBtn,
                  weatherTab === 'home' && [styles.weatherTabBtnActive, { backgroundColor: colors.card }]
                ]}
              >
                <Text
                  style={[
                    styles.weatherTabBtnText,
                    { color: weatherTab === 'home' ? colors.brand : colors.textMuted }
                  ]}
                >
                  Home City
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setWeatherTab('trip')}
                style={[
                  styles.weatherTabBtn,
                  weatherTab === 'trip' && [styles.weatherTabBtnActive, { backgroundColor: colors.card }]
                ]}
              >
                <Text
                  style={[
                    styles.weatherTabBtnText,
                    { color: weatherTab === 'trip' ? colors.brand : colors.textMuted }
                  ]}
                >
                  Trip Dest
                </Text>
              </TouchableOpacity>
            </View>

            {/* Current Weather card */}
            <View style={[styles.weatherMainCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
              <View style={styles.weatherMainInfo}>
                <Text style={[styles.weatherCityName, { color: colors.text }]} numberOfLines={1}>
                  {activeWeather.city}
                </Text>
                <Text style={[styles.weatherMainCondText, { color: colors.textSecondary }]}>
                  {activeWeather.conditionText}
                </Text>
                <Text style={[styles.weatherMainTempText, { color: colors.text }]}>
                  {activeWeather.temp}°C
                </Text>
              </View>
              <Ionicons
                name={activeWeather.icon as any}
                size={54}
                color={activeWeather.condition === 'sunny' ? '#F59E0B' : (activeWeather.condition === 'rainy' ? '#3B82F6' : '#9CA3AF')}
                style={styles.weatherMainIcon}
              />
            </View>

            {/* Metrics */}
            <View style={styles.weatherMetricsContainer}>
              <View style={[styles.weatherMetricItem, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                <Ionicons name="water-outline" size={16} color="#3B82F6" />
                <Text style={[styles.weatherMetricVal, { color: colors.text }]}>{activeWeather.humidity}%</Text>
                <Text style={[styles.weatherMetricLabel, { color: colors.textMuted }]}>humidity</Text>
              </View>
              <View style={[styles.weatherMetricItem, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                <Ionicons name="sunny-outline" size={16} color="#F59E0B" />
                <Text style={[styles.weatherMetricVal, { color: colors.text }]}>{activeWeather.uvIndex}</Text>
                <Text style={[styles.weatherMetricLabel, { color: colors.textMuted }]}>uv index</Text>
              </View>
              <View style={[styles.weatherMetricItem, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                <Ionicons name="thunderstorm-outline" size={16} color="#38BDF8" />
                <Text style={[styles.weatherMetricVal, { color: colors.text }]}>{activeWeather.windSpeed} km/h</Text>
                <Text style={[styles.weatherMetricLabel, { color: colors.textMuted }]}>wind speed</Text>
              </View>
            </View>

            {/* 5-Day Forecast */}
            <Text style={[styles.forecastHeaderTitle, { color: colors.text }]}>5-Day Forecast</Text>
            <ScrollView contentContainerStyle={styles.forecastList} showsVerticalScrollIndicator={false}>
              {activeWeather.forecast.map((fc, idx) => (
                <View key={idx} style={styles.forecastRow}>
                  <Text style={[styles.forecastDayName, { color: colors.text }]}>{fc.day}</Text>
                  <View style={styles.forecastMidSection}>
                    <Ionicons
                      name={fc.icon as any}
                      size={16}
                      color={fc.condition === 'sunny' ? '#F59E0B' : (fc.condition === 'rainy' ? '#3B82F6' : '#9CA3AF')}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={[styles.forecastCondText, { color: colors.textSecondary }]}>{fc.condition}</Text>
                  </View>
                  <View style={styles.forecastTempRange}>
                    <Text style={[styles.forecastTempText, { color: colors.textMuted }]}>{fc.tempMin}°</Text>
                    <View style={[styles.forecastTempBarTrack, { backgroundColor: colors.surface }]}>
                      <View style={[styles.forecastTempBarActive, { backgroundColor: '#22C55E' }]} />
                    </View>
                    <Text style={[styles.forecastTempText, { color: colors.text }]}>{fc.tempMax}°</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  weatherWidget: {
    width: 125,
    height: '100%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weatherLabel: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontWeight: '600',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  weatherIcon: {
    fontSize: 20,
    marginBottom: 1,
  },
  weatherTemp: {
    fontSize: 22,
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontWeight: '800',
    lineHeight: 24,
  },
  weatherLocation: {
    fontSize: 9,
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontWeight: '600',
    marginTop: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  weatherExpandedCard: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    height: 520,
  },
  expandedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  expandedTitle: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
  },
  weatherTabContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 3,
    marginBottom: 12,
  },
  weatherTabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 9,
  },
  weatherTabBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  weatherTabBtnText: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
  },
  weatherMainCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  weatherMainInfo: {
    flex: 1,
  },
  weatherCityName: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
  },
  weatherMainCondText: {
    fontSize: 12,
    marginTop: 2,
    marginBottom: 4,
  },
  weatherMainTempText: {
    fontSize: 28,
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontWeight: '800',
  },
  weatherMainIcon: {
    marginLeft: 12,
  },
  weatherMetricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 16,
  },
  weatherMetricItem: {
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 8,
  },
  weatherMetricVal: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    marginTop: 3,
  },
  weatherMetricLabel: {
    fontSize: 9,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  forecastHeaderTitle: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    marginBottom: 8,
  },
  forecastList: {
    gap: 8,
  },
  forecastRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 24,
  },
  forecastDayName: {
    width: 32,
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
  },
  forecastMidSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingLeft: 8,
  },
  forecastCondText: {
    fontSize: 11,
  },
  forecastTempRange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  forecastTempText: {
    fontSize: 11,
  },
  forecastTempBarTrack: {
    width: 44,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  forecastTempBarActive: {
    width: '60%',
    height: '100%',
    alignSelf: 'center',
    borderRadius: 2,
  },
});
