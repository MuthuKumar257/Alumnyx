import React, { useContext } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform } from 'react-native';
import { House, Users, BriefcaseBusiness, MessageCircle, Trophy, UserRound, Shield } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

import HomeScreen from '../screens/HomeScreen';
import JobsScreen from '../screens/JobsScreen';
import MessagesScreen from '../screens/MessagesScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ConnectionsScreen from '../screens/ConnectionsScreen';
import AchievementPostsScreen from '../screens/AchievementPostsScreen';
import AdminDashboard from '../screens/AdminDashboard';
import { AuthContext } from '../context/AuthContext';
import WebSidebarLayout from './WebSidebarLayout';
import { alumnyxTheme } from '../theme/alumnyxTheme';

const Tab = createBottomTabNavigator();

const TAB_ICONS: Record<string, LucideIcon> = {
    Home: House,
    Connections: Users,
    Jobs: BriefcaseBusiness,
    Messages: MessageCircle,
    Post: Trophy,
    Profile: UserRound,
    Admin: Shield,
};

const MobileTabNavigator = () => {
    const { user } = useContext(AuthContext);

    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: true,
                headerStyle: { backgroundColor: alumnyxTheme.colors.surface },
                headerTintColor: alumnyxTheme.colors.primary,
                headerTitleStyle: { fontWeight: '700' },
                tabBarActiveTintColor: alumnyxTheme.colors.primary,
                tabBarInactiveTintColor: alumnyxTheme.colors.muted,
                tabBarStyle: {
                    paddingBottom: 6,
                    paddingTop: 6,
                    height: 64,
                    backgroundColor: alumnyxTheme.colors.surface,
                    borderTopColor: alumnyxTheme.colors.border,
                    borderTopWidth: 1,
                },
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: '600',
                },
                tabBarIcon: ({ focused }) => {
                    const Icon = TAB_ICONS[route.name] || House;
                    return <Icon size={18} color={focused ? alumnyxTheme.colors.primary : alumnyxTheme.colors.muted} strokeWidth={2.2} />;
                },
            })}
        >
            <Tab.Screen name="Home" component={HomeScreen} />
            <Tab.Screen name="Connections" component={ConnectionsScreen} />
            <Tab.Screen name="Jobs" component={JobsScreen} />
            <Tab.Screen name="Messages" component={MessagesScreen} />
            <Tab.Screen name="Post" component={AchievementPostsScreen} />
            <Tab.Screen name="Profile" component={ProfileScreen} />
            {user?.role === 'ADMIN' && (
                <Tab.Screen name="Admin" component={AdminDashboard} />
            )}
        </Tab.Navigator>
    );
};

export default function MainTabNavigator() {
    if (Platform.OS === 'web') {
        return <WebSidebarLayout />;
    }
    return <MobileTabNavigator />;
}
