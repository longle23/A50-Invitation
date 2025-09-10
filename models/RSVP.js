const { getDB } = require('../config/database');

class RSVP {
    constructor(data) {
        this.id = data.id;
        this.guestId = data.guestId;
        this.status = data.status; // 'pending', 'confirmed', 'declined'
        this.confirmedAt = data.confirmedAt;
        this.notes = data.notes;
        this.attendance = data.attendance; // 'yes', 'no', 'maybe'
        this.dietaryRequirements = data.dietaryRequirements;
        this.plusOne = data.plusOne;
        this.plusOneName = data.plusOneName;
    }

    static async findByGuestId(guestId) {
        try {
            const db = getDB();
            const rsvp = await db.collection('rsvps').findOne({ guestId: guestId });
            return rsvp ? new RSVP(rsvp) : null;
        } catch (error) {
            console.error('Error finding RSVP:', error);
            throw error;
        }
    }

    static async findAll() {
        try {
            const db = getDB();
            const rsvps = await db.collection('rsvps').find({}).toArray();
            return rsvps.map(rsvp => new RSVP(rsvp));
        } catch (error) {
            console.error('Error finding all RSVPs:', error);
            throw error;
        }
    }

    static async getStats() {
        try {
            const db = getDB();
            const stats = await db.collection('rsvps').aggregate([
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 }
                    }
                }
            ]).toArray();
            
            const result = {
                total: 0,
                confirmed: 0,
                declined: 0,
                pending: 0
            };
            
            stats.forEach(stat => {
                result.total += stat.count;
                result[stat._id] = stat.count;
            });
            
            return result;
        } catch (error) {
            console.error('Error getting RSVP stats:', error);
            throw error;
        }
    }

    async save() {
        try {
            const db = getDB();
            const result = await db.collection('rsvps').updateOne(
                { guestId: this.guestId },
                { 
                    $set: {
                        guestId: this.guestId,
                        status: this.status,
                        confirmedAt: this.confirmedAt,
                        notes: this.notes,
                        attendance: this.attendance,
                        dietaryRequirements: this.dietaryRequirements,
                        plusOne: this.plusOne,
                        plusOneName: this.plusOneName,
                        updatedAt: new Date()
                    }
                },
                { upsert: true }
            );
            return result;
        } catch (error) {
            console.error('Error saving RSVP:', error);
            throw error;
        }
    }

    static async updateByGuestId(guestId, updateData) {
        try {
            const db = getDB();
            const result = await db.collection('rsvps').updateOne(
                { guestId: guestId },
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
            console.error('Error updating RSVP:', error);
            throw error;
        }
    }

    static async deleteByGuestId(guestId) {
        try {
            const db = getDB();
            const result = await db.collection('rsvps').deleteOne({ guestId: guestId });
            return result;
        } catch (error) {
            console.error('Error deleting RSVP:', error);
            throw error;
        }
    }
}

module.exports = RSVP;
