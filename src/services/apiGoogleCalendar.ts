import { getSetting, updateSetting } from './apiSettings';

// Scopes required for the application
export const SCOPES = 'https://www.googleapis.com/auth/calendar.events';

// Types
export interface CalendarEvent {
    summary: string;
    description?: string;
    location?: string;
    start: {
        dateTime?: string; // ISO string for specific time
        date?: string; // YYYY-MM-DD for all-day
        timeZone?: string;
    };
    end: {
        dateTime?: string;
        date?: string;
        timeZone?: string;
    };
}

// Token management (Database persistence)
export const setAccessToken = async (token: string) => {
    // Store in database for persistence across devices/sessions
    await updateSetting('google_calendar_access_token', token);
};

export const getAccessToken = async () => {
    return await getSetting('google_calendar_access_token');
};

export const clearAccessToken = async () => {
    await updateSetting('google_calendar_access_token', '');
};

export const insertEvent = async (event: CalendarEvent) => {
    const token = await getAccessToken();
    if (!token) {
        console.warn('Google Calendar: No access token found.');
        return null;
    }

    try {
        const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(event),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Failed to create event');
        }

        const data = await response.json();
        console.log('Google Calendar Response:', data);
        return data;
    } catch (error) {
        console.error('Google Calendar Error:', error);
        throw error;
    }
};

export const checkConnection = async () => {
    const token = await getAccessToken();
    if (!token) return false;

    // Check connection by listing events from primary calendar (matches our scope: calendar.events)
    try {
        const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=1', {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        // Only clear if strictly 401 (Unauthorized). 
        if (response.status === 401) {
            console.warn('Google Token expired, clearing...');
            await clearAccessToken();
            return false;
        }

        return response.ok;
    } catch {
        return false;
    }
};

export const getClientId = async () => {
    return await getSetting('google_calendar_client_id');
};
