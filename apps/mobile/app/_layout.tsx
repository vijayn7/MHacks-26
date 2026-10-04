import { useFonts } from 'expo-font'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { ActivityIndicator, View } from 'react-native'

export default function RootLayout() {
  const [loaded] = useFonts({
    Neco: require('../assets/fonts/Neco-400.ttf'),
    'Neco-Medium': require('../assets/fonts/Neco-500.ttf'),
    Satoshi: require('../assets/fonts/Satoshi-400.ttf'),
    'Satoshi-Medium': require('../assets/fonts/Satoshi-500.ttf'),
  })

  if (!loaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' }}>
        <ActivityIndicator color="#FFF3D6" />
      </View>
    )
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#000' } }} />
    </>
  )
}
