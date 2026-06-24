"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_SETTINGS = void 0;
exports.DEFAULT_SETTINGS = {
    reminders: [
        { minutes: 5, enabled: true },
        { minutes: 10, enabled: false },
        { minutes: 15, enabled: true },
    ],
    customReminders: [],
    animationDuration: 8,
    animationSpeed: 'medium',
    messageTemplate: '{title} starts in {minutes} min on {platform}',
    planeColor: '#3B82F6',
    bannerColor: '#FFFFFF',
    textColor: '#1F2937',
    fontFamily: 'Inter',
    fontSize: 18,
    fontWeight: '600',
    soundEnabled: true,
    soundVolume: 0.7,
    platformThemes: {
        google: {},
        teams: {},
        zoom: {},
        unknown: {},
    },
    launchAtLogin: false,
    googleCalendarEnabled: false,
    microsoftCalendarEnabled: false,
};
