import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

// HOME — house with Z roof
function HomeIcon({ focused }: { focused: boolean }) {
  const c = focused ? '#A78BFA' : '#4A4560';
  return (
    <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      {focused ? (
        <>
          <Path d="M3 12L12 3L21 12V21H15V15H9V21H3V12Z" fill={c}/>
          <Path d="M9 3L12 1L15 3" fill="#C8F53B"/>
        </>
      ) : (
        <>
          <Path d="M3 12L12 3L21 12V21H15V15H9V21H3V12Z" stroke={c} strokeWidth="1.8" strokeLinejoin="round"/>
          <Path d="M9 3L12 1L15 3" stroke="#7A7595" strokeWidth="1.5" strokeLinejoin="round"/>
        </>
      )}
    </Svg>
  );
}

// MATCH — two people with a spark between them
function MatchIcon({ focused }: { focused: boolean }) {
  const c = focused ? '#A78BFA' : '#4A4560';
  return (
    <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      {focused ? (
        <>
          <Circle cx="8" cy="8" r="3" fill={c}/>
          <Path d="M2 20C2 17 4.5 15 8 15" stroke={c} strokeWidth="1.8" strokeLinecap="round"/>
          <Circle cx="16" cy="8" r="3" fill={c}/>
          <Path d="M22 20C22 17 19.5 15 16 15" stroke={c} strokeWidth="1.8" strokeLinecap="round"/>
          <Path d="M12 12L11 10L12 8L13 10L12 12Z" fill="#C8F53B"/>
        </>
      ) : (
        <>
          <Circle cx="8" cy="8" r="3" stroke={c} strokeWidth="1.8"/>
          <Path d="M2 20C2 17 4.5 15 8 15" stroke={c} strokeWidth="1.8" strokeLinecap="round"/>
          <Circle cx="16" cy="8" r="3" stroke={c} strokeWidth="1.8"/>
          <Path d="M22 20C22 17 19.5 15 16 15" stroke={c} strokeWidth="1.8" strokeLinecap="round"/>
          <Path d="M12 12L11 10L12 8L13 10L12 12Z" stroke="#4A4560" strokeWidth="1.2"/>
        </>
      )}
    </Svg>
  );
}

// ZIZO — Z face in a circle (the AI)
function ZizoIcon({ focused }: { focused: boolean }) {
  const c = focused ? '#A78BFA' : '#4A4560';
  return (
    <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      {focused ? (
        <>
          <Circle cx="12" cy="12" r="10" fill={c}/>
          <Path d="M8 8.5L16 8.5L10 15.5L16 15.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          <Circle cx="17" cy="7" r="2.5" fill="#C8F53B"/>
        </>
      ) : (
        <>
          <Circle cx="12" cy="12" r="10" stroke={c} strokeWidth="1.8"/>
          <Path d="M8 8.5L16 8.5L10 15.5L16 15.5" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          <Circle cx="17" cy="7" r="2" stroke="#4A4560" strokeWidth="1.5"/>
        </>
      )}
    </Svg>
  );
}

// PLACES — map pin with cashback symbol
function PlacesIcon({ focused }: { focused: boolean }) {
  const c = focused ? '#A78BFA' : '#4A4560';
  return (
    <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      {focused ? (
        <>
          <Path d="M12 2C8.5 2 6 4.5 6 8C6 13 12 22 12 22C12 22 18 13 18 8C18 4.5 15.5 2 12 2Z" fill={c}/>
          <Circle cx="12" cy="8" r="2.5" fill="#fff"/>
        </>
      ) : (
        <>
          <Path d="M12 2C8.5 2 6 4.5 6 8C6 13 12 22 12 22C12 22 18 13 18 8C18 4.5 15.5 2 12 2Z" stroke={c} strokeWidth="1.8" strokeLinejoin="round"/>
          <Circle cx="12" cy="8" r="2" stroke={c} strokeWidth="1.5"/>
        </>
      )}
    </Svg>
  );
}

// WALLET — wallet with coin
function WalletIcon({ focused }: { focused: boolean }) {
  const c = focused ? '#A78BFA' : '#4A4560';
  return (
    <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      {focused ? (
        <>
          <Rect x="2" y="6" width="20" height="14" rx="3" fill={c}/>
          <Path d="M2 10H22" stroke="#fff" strokeWidth="1.5"/>
          <Rect x="14" y="13" width="6" height="4" rx="2" fill="#C8F53B"/>
          <Circle cx="17" cy="15" r="1" fill="#0B0914"/>
        </>
      ) : (
        <>
          <Rect x="2" y="6" width="20" height="14" rx="3" stroke={c} strokeWidth="1.8"/>
          <Path d="M2 10H22" stroke={c} strokeWidth="1.5"/>
          <Rect x="14" y="13" width="6" height="4" rx="2" stroke={c} strokeWidth="1.5"/>
        </>
      )}
    </Svg>
  );
}

// PROFILE — person with alias badge
function ProfileIcon({ focused }: { focused: boolean }) {
  const c = focused ? '#A78BFA' : '#4A4560';
  return (
    <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      {focused ? (
        <>
          <Circle cx="12" cy="7" r="4" fill={c}/>
          <Path d="M4 21C4 17 7.5 14 12 14C16.5 14 20 17 20 21" stroke={c} strokeWidth="1.8" strokeLinecap="round"/>
          <Circle cx="18" cy="6" r="3" fill="#C8F53B"/>
          <Path d="M16.5 6L17.5 7L19.5 5" stroke="#0B0914" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
        </>
      ) : (
        <>
          <Circle cx="12" cy="7" r="4" stroke={c} strokeWidth="1.8"/>
          <Path d="M4 21C4 17 7.5 14 12 14C16.5 14 20 17 20 21" stroke={c} strokeWidth="1.8" strokeLinecap="round"/>
        </>
      )}
    </Svg>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0F0C1A',
          borderTopColor: '#231E3A',
          borderTopWidth: 1,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom + 6,
          paddingTop: 8,
        },
        tabBarShowLabel: false,
        tabBarActiveTintColor: '#A78BFA',
        tabBarInactiveTintColor: '#4A4560',
      }}
    >
      <Tabs.Screen name="index" options={{ tabBarIcon: ({ focused }) => <HomeIcon focused={focused} /> }} />
      <Tabs.Screen name="matches" options={{ tabBarIcon: ({ focused }) => <MatchIcon focused={focused} /> }} />
      <Tabs.Screen name="zizo" options={{ tabBarIcon: ({ focused }) => <ZizoIcon focused={focused} /> }} />
      <Tabs.Screen name="venues" options={{ tabBarIcon: ({ focused }) => <PlacesIcon focused={focused} /> }} />
      <Tabs.Screen name="wallet" options={{ tabBarIcon: ({ focused }) => <WalletIcon focused={focused} /> }} />
      <Tabs.Screen name="profile" options={{ tabBarIcon: ({ focused }) => <ProfileIcon focused={focused} /> }} />
    </Tabs>
  );
}