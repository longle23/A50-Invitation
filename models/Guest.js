const { getDB } = require('../config/database');

class Guest {
    constructor(data) {
        this.id = data.id;
        this.salutation = data.salutation;
        this.name = data.name;
        this.position = data.position;
        this.company = data.company;
    }

    static async findById(guestId) {
        try {
            const db = getDB();
            const guest = await db.collection('guests').findOne({ id: guestId });
            return guest ? new Guest(guest) : null;
        } catch (error) {
            console.error('Error finding guest:', error);
            throw error;
        }
    }

    static async findAll() {
        try {
            const db = getDB();
            const guests = await db.collection('guests').find({}).toArray();
            return guests.map(guest => new Guest(guest));
        } catch (error) {
            console.error('Error finding all guests:', error);
            throw error;
        }
    }

    async save() {
        try {
            const db = getDB();
            const result = await db.collection('guests').updateOne(
                { id: this.id },
                { 
                    $set: {
                        id: this.id,
                        salutation: this.salutation,
                        name: this.name,
                        position: this.position,
                        company: this.company,
                        updatedAt: new Date()
                    }
                },
                { upsert: true }
            );
            return result;
        } catch (error) {
            console.error('Error saving guest:', error);
            throw error;
        }
    }

    static async updateById(guestId, updateData) {
        try {
            const db = getDB();
            const result = await db.collection('guests').updateOne(
                { id: guestId },
                { 
                    $set: {
                        ...updateData,
                        updatedAt: new Date()
                    }
                }
            );
            return result;
        } catch (error) {
            console.error('Error updating guest:', error);
            throw error;
        }
    }

    static async deleteById(guestId) {
        try {
            const db = getDB();
            const result = await db.collection('guests').deleteOne({ id: guestId });
            return result;
        } catch (error) {
            console.error('Error deleting guest:', error);
            throw error;
        }
    }
}

module.exports = Guest;
