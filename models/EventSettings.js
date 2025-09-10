const { getDB } = require('../config/database');

class EventSettings {
    constructor(data) {
        this.id = data.id || 'main';
        this.checkinEnabled = data.checkinEnabled || false;
        this.rsvpEnabled = data.rsvpEnabled || true;
        this.eventDate = data.eventDate;
        this.eventTime = data.eventTime;
        this.eventLocation = data.eventLocation;
        this.requireConfirmation = data.requireConfirmation || true;
        this.allowWalkIn = data.allowWalkIn || false;
    }

    static async getSettings() {
        try {
            const db = getDB();
            const settings = await db.collection('eventSettings').findOne({ id: 'main' });
            return settings ? new EventSettings(settings) : new EventSettings({});
        } catch (error) {
            console.error('Error getting event settings:', error);
            throw error;
        }
    }

    async save() {
        try {
            const db = getDB();
            const result = await db.collection('eventSettings').updateOne(
                { id: this.id },
                { 
                    $set: {
                        id: this.id,
                        checkinEnabled: this.checkinEnabled,
                        rsvpEnabled: this.rsvpEnabled,
                        eventDate: this.eventDate,
                        eventTime: this.eventTime,
                        eventLocation: this.eventLocation,
                        requireConfirmation: this.requireConfirmation,
                        allowWalkIn: this.allowWalkIn,
                        updatedAt: new Date()
                    }
                },
                { upsert: true }
            );
            return result;
        } catch (error) {
            console.error('Error saving event settings:', error);
            throw error;
        }
    }

    static async updateSettings(updateData) {
        try {
            const db = getDB();
            const result = await db.collection('eventSettings').updateOne(
                { id: 'main' },
                { 
                    $set: {
                        ...updateData,
                        updatedAt: new Date()
                    }
                },
                { upsert: true }
            );
            return result;
        } catch (error) {
            console.error('Error updating event settings:', error);
            throw error;
        }
    }
}

module.exports = EventSettings;
