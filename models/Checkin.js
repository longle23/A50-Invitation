const { getDB } = require('../config/database');

class Checkin {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.checkinTime = data.checkinTime || new Date().toISOString();
        this.timestamp = data.timestamp || Date.now();
    }

    static async findByGuestId(guestId) {
        try {
            const db = getDB();
            const checkin = await db.collection('checkins').findOne({ id: guestId });
            return checkin ? new Checkin(checkin) : null;
        } catch (error) {
            console.error('Error finding checkin:', error);
            throw error;
        }
    }

    static async findAll() {
        try {
            const db = getDB();
            const checkins = await db.collection('checkins').find({}).sort({ timestamp: -1 }).toArray();
            return checkins.map(checkin => new Checkin(checkin));
        } catch (error) {
            console.error('Error finding all checkins:', error);
            throw error;
        }
    }

    static async getRecent(limit = 10) {
        try {
            const db = getDB();
            const checkins = await db.collection('checkins').find({}).sort({ timestamp: -1 }).limit(limit).toArray();
            return checkins.map(checkin => new Checkin(checkin));
        } catch (error) {
            console.error('Error finding recent checkins:', error);
            throw error;
        }
    }

    static async getCount() {
        try {
            const db = getDB();
            const count = await db.collection('checkins').countDocuments();
            return count;
        } catch (error) {
            console.error('Error counting checkins:', error);
            throw error;
        }
    }

    async save() {
        try {
            const db = getDB();
            const result = await db.collection('checkins').insertOne({
                id: this.id,
                name: this.name,
                checkinTime: this.checkinTime,
                timestamp: this.timestamp,
                createdAt: new Date()
            });
            return result;
        } catch (error) {
            console.error('Error saving checkin:', error);
            throw error;
        }
    }

    static async deleteByGuestId(guestId) {
        try {
            const db = getDB();
            const result = await db.collection('checkins').deleteOne({ id: guestId });
            return result;
        } catch (error) {
            console.error('Error deleting checkin:', error);
            throw error;
        }
    }
}

module.exports = Checkin;
