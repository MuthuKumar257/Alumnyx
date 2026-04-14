import React, { useContext, useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthContext } from '../context/AuthContext';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import AlumniRegisterScreen from '../screens/AlumniRegisterScreen';
import MainTabNavigator from './MainTabNavigator';
import SplashScreen from '../screens/SplashScreen';
import AdminPanelScreen from '../screens/AdminPanelScreen';
import SettingsScreen from '../screens/SettingsScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import OtherUserProfileScreen from '../screens/OtherUserProfileScreen';

const Stack = createNativeStackNavigator();

const linking = {
    prefixes: ['http://localhost:3000', 'http://localhost:8082'],
    config: {
        screens: {
            Login: 'login',
            Register: 'register',
            AlumniRegister: 'alumni/register',
            Admin: 'admin/:section?',
            Student: 'student',
            Alumni: 'alumni',
        },
    },
};

export default function AppNavigator() {
    const { user, isLoading } = useContext(AuthContext);
    const [minSplashDone, setMinSplashDone] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setMinSplashDone(true), 10000);
        return () => clearTimeout(timer);
    }, []);

    if (isLoading || !minSplashDone) {
        return <SplashScreen />;
    }

    return (
        <NavigationContainer linking={linking}>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                {user ? (
                    user.role === 'ADMIN' ? (
                        <>
                            <Stack.Screen name="Admin" component={AdminPanelScreen} />
                        </>
                    ) : user.role === 'ALUMNI' ? (
                        <>
                            <Stack.Screen name="Alumni" component={MainTabNavigator} />
                            <Stack.Screen name="Settings" component={SettingsScreen} />
                            <Stack.Screen name="EditProfile" component={EditProfileScreen} />
                            <Stack.Screen name="OtherUserProfile" component={OtherUserProfileScreen} />
                        </>
                    ) : (
                        <>
                            <Stack.Screen name="Student" component={MainTabNavigator} />
                            <Stack.Screen name="Settings" component={SettingsScreen} />
                            <Stack.Screen name="EditProfile" component={EditProfileScreen} />
                            <Stack.Screen name="OtherUserProfile" component={OtherUserProfileScreen} />
                        </>
                    )
                ) : (
                    <>
                        <Stack.Screen name="Login" component={LoginScreen} />
                        <Stack.Screen name="Admin" component={LoginScreen} initialParams={{ adminOnly: true }} />
                        <Stack.Screen name="Register" component={RegisterScreen} />
                        <Stack.Screen name="AlumniRegister" component={AlumniRegisterScreen} />
                    </>
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
}
