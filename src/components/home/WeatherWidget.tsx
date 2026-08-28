import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

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
        label: "Trip weather",
        data: getWeatherDataForCity(nextTrip.destination)
      };
    }
    return {
      label: "Home weather",
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
        activeOpacity={0.85}
        onPress={() => {
          setWeatherTab(upcomingTrips.length > 0 ? 'trip' : 'home');
          setIsWeatherExpanded(true);
        }}
        style={[styles.weatherWidget, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
      >
        {/* Top row: Label + Icon */}
        <View style={styles.weatherHeaderRow}>
          <Text style={[styles.weatherLabel, { color: colors.textMuted }]}>
            {contextualWeather.label.split(' ')[0]}
          </Text>
          <Ionicons
            name={contextualWeather.data.icon as any}
            size={16}
            color={contextualWeather.data.condition === 'sunny' ? '#FFA500' : (contextualWeather.data.condition === 'rainy' ? '#3B82F6' : '#9CA3AF')}
          />
        </View>

        {/* Temperature + Condition */}
        <View style={styles.weatherTempContainer}>
          <Text style={[styles.weatherTemp, { color: colors.text }]}>{contextualWeather.data.temp}°</Text>
          <Text style={[styles.weatherCondText, { color: colors.textSecondary }]} numberOfLines={1}>
            {contextualWeather.data.conditionText}
          </Text>
        </View>

        {/* Location at bottom */}
        <Text style={[styles.weatherLocation, { color: colors.text }]} numberOfLines={1}>
          {contextualWeather.data.city.split(',')[0]}
        </Text>
      </TouchableOpacity>

      {/* Weather Details Modal as Bottom Sheet */}
      <Modal
        visible={isWeatherExpanded}
        animationType="slide"
        transparent
        onRequestClose={() => setIsWeatherExpanded(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setIsWeatherExpanded(false)}
        >
          <TouchableOpacity activeOpacity={1} style={[styles.weatherExpandedCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            {/* Bottom Sheet Handle */}
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.divider || '#E8E8E6', alignSelf: 'center', marginBottom: 16 }} />

            <View style={styles.expandedHeader}>
              <Text style={[styles.expandedTitle, { color: colors.text }]}>Destination Weather</Text>
              <TouchableOpacity onPress={() => setIsWeatherExpanded(false)} style={{ padding: 4 }}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Segmented control */}
            <View style={[styles.weatherTabContainer, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
              <TouchableOpacity
                onPress={() => setWeatherTab('home')}
                style={[
                  styles.weatherTabBtn,
                  weatherTab === 'home' && { backgroundColor: colors.card }
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
                  weatherTab === 'trip' && { backgroundColor: colors.card }
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
                size={50}
                color={activeWeather.condition === 'sunny' ? '#FF9F1C' : (activeWeather.condition === 'rainy' ? '#3B82F6' : '#9CA3AF')}
                style={styles.weatherMainIcon}
              />
            </View>

            {/* Metrics */}
            <View style={styles.weatherMetricsContainer}>
              <View style={[styles.weatherMetricItem, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                <Ionicons name="water-outline" size={16} color="#3B82F6" />
                <Text style={[styles.weatherMetricVal, { color: colors.text }]}>{activeWeather.humidity}%</Text>
                <Text style={[styles.weatherMetricLabel, { color: colors.textMuted }]}>Humidity</Text>
              </View>
              <View style={[styles.weatherMetricItem, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                <Ionicons name="sunny-outline" size={16} color="#FF9F1C" />
                <Text style={[styles.weatherMetricVal, { color: colors.text }]}>{activeWeather.uvIndex}</Text>
                <Text style={[styles.weatherMetricLabel, { color: colors.textMuted }]}>UV Index</Text>
              </View>
              <View style={[styles.weatherMetricItem, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                <Ionicons name="thunderstorm-outline" size={16} color="#38BDF8" />
                <Text style={[styles.weatherMetricVal, { color: colors.text }]}>{activeWeather.windSpeed} km/h</Text>
                <Text style={[styles.weatherMetricLabel, { color: colors.textMuted }]}>Wind</Text>
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
                      color={fc.condition === 'sunny' ? '#FF9F1C' : (fc.condition === 'rainy' ? '#3B82F6' : '#9CA3AF')}
                      style={{ marginRight: 8 }}
                    />
                    <Text style={[styles.forecastCondText, { color: colors.textSecondary }]}>{fc.condition}</Text>
                  </View>
                  <View style={styles.forecastTempRange}>
                    <Text style={[styles.forecastTempText, { color: colors.textMuted }]}>{fc.tempMin}°</Text>
                    <View style={[styles.forecastTempBarTrack, { backgroundColor: colors.divider }]}>
                      <View style={[styles.forecastTempBarActive, { backgroundColor: colors.brand }]} />
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
  // Card: white surface, 1px border, 20 radius
  weatherWidget: {
    width: 125,
    height: '100%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  weatherHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  weatherLabel: {
    fontSize: 11,
    fontFamily: 'Poppins-Medium',
    letterSpacing: 0.2,
  },
  weatherTempContainer: {
    marginTop: 4,
  },
  // Hero stat
  weatherTemp: {
    fontSize: 28,
    fontFamily: 'Poppins-SemiBold',
    lineHeight: 32,
  },
  weatherCondText: {
    fontSize: 11,
    fontFamily: 'Poppins-Regular',
    marginTop: 1,
  },
  weatherLocation: {
    fontSize: 13,
    fontFamily: 'Poppins-SemiBold',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(23, 23, 23, 0.35)',
    justifyContent: 'flex-end',
  },
  weatherExpandedCard: {
    width: '100%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 40,
    height: 540,
  },
  expandedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  expandedTitle: {
    fontSize: 20,
    fontFamily: 'Poppins-SemiBold',
    letterSpacing: -0.2,
  },
  weatherTabContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 3,
    marginBottom: 18,
  },
  weatherTabBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 9,
  },
  weatherTabBtnText: {
    fontSize: 12,
    fontFamily: 'Poppins-SemiBold',
  },
  weatherMainCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
  },
  weatherMainInfo: {
    flex: 1,
  },
  weatherCityName: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
  },
  weatherMainCondText: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    marginTop: 2,
    marginBottom: 6,
  },
  weatherMainTempText: {
    fontSize: 28,
    fontFamily: 'Poppins-SemiBold',
  },
  weatherMainIcon: {
    marginLeft: 12,
  },
  weatherMetricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 22,
  },
  weatherMetricItem: {
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 14,
  },
  weatherMetricVal: {
    fontSize: 13,
    fontFamily: 'Poppins-SemiBold',
    marginTop: 5,
  },
  weatherMetricLabel: {
    fontSize: 10,
    fontFamily: 'Poppins-Regular',
    marginTop: 2,
  },
  forecastHeaderTitle: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    marginBottom: 12,
  },
  forecastList: {
    gap: 12,
  },
  forecastRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 28,
  },
  forecastDayName: {
    width: 36,
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
  },
  forecastMidSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingLeft: 8,
  },
  forecastCondText: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
  },
  forecastTempRange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  forecastTempText: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
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