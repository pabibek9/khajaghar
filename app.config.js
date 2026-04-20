import 'dotenv/config';

export default {
    "expo": {
        "owner": "bibekparajuli1s-organization",
        "name": "khajaghar",
        "slug": "khaja-ghar",
        "version": "1.0.0",
        "orientation": "portrait",
        "icon": "./assets/images/final logo .png",
        "scheme": "khajaghar",
        "userInterfaceStyle": "automatic",
        "newArchEnabled": true,

        "ios": {
            "supportsTablet": true,
            "bundleIdentifier": "com.bibekparajuli.khajaghar",
            "googleServicesFile": "./google-services.json",
            "config": {
                "googleMaps": {
                    "apiKey": process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
                }
            },
            "infoPlist": {
                "ITSAppUsesNonExemptEncryption": false,
                "NSLocationWhenInUseUsageDescription": "Allow Khajaghar to use your location to find nearby restaurants and deliver your food.",
                "NSLocationAlwaysAndWhenInUseUsageDescription": "Allow Khajaghar to use your location to find nearby restaurants and deliver your food."
            }
        },
        "android": {
            "adaptiveIcon": {
                "backgroundColor": "#ffffff",
                "foregroundImage": "./assets/images/final logo .png"
            },
            "permissions": [
                "ACCESS_COARSE_LOCATION",
                "ACCESS_FINE_LOCATION",
                "FOREGROUND_SERVICE"
            ],
            "edgeToEdgeEnabled": true,
            "predictiveBackGestureEnabled": false,
            "package": "com.bibekparajuli.khajaghar",
            "googleServicesFile": "./google-services.json",
            "config": {
                "googleMaps": {
                    "apiKey": process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
                }
            },
            "navigationBar": {
                "backgroundColor": "#000000"
            }
        },
        "web": {
            "output": "static",
            "favicon": "./assets/images/final logo .png"
        },
        "plugins": [
            "expo-router",
            [
                "expo-splash-screen",
                {
                    "image": "./assets/images/final logo .png",
                    "imageWidth": 200,
                    "resizeMode": "contain",
                    "backgroundColor": "#ffffff",
                    "dark": {
                        "backgroundColor": "#000000"
                    }
                }
            ],
            "expo-web-browser",
            [
                "expo-notifications",
                {
                    "icon": "./assets/images/final logo .png",
                    "color": "#ffffff",
                    "sounds": []
                }
            ]
        ],
        "experiments": {
            "typedRoutes": true,
            "reactCompiler": true
        },
        "extra": {
            "webClientId": process.env.EXPO_PUBLIC_WEB_CLIENT_ID,
            "androidClientId": process.env.EXPO_PUBLIC_ANDROID_CLIENT_ID,
            "iosClientId": process.env.EXPO_PUBLIC_IOS_CLIENT_ID,
            "router": {},
            "eas": {
                "projectId": "da26155f-f538-4973-96ec-1de8d3dde315"
            }
        }
    }
};
