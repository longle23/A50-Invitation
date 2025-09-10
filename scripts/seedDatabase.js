const fs = require('fs');
const csv = require('csv-parser');
const { connectDB, getDB } = require('../config/database');
const Guest = require('../models/Guest');

async function seedDatabase() {
    try {
        console.log('🌱 Starting database seeding...');
        
        // Connect to MongoDB
        await connectDB();
        const db = getDB();
        
        // Clear existing data
        await db.collection('guests').deleteMany({});
        await db.collection('checkins').deleteMany({});
        console.log('🗑️ Cleared existing data');
        
        // Read CSV and insert guests
        const guests = [];
        await new Promise((resolve, reject) => {
            fs.createReadStream('./resources/Guest_List_Cleaned.csv')
                .pipe(csv())
                .on('data', (row) => {
                    const code = (row['Code'] || '').toString().trim();
                    if (!code) return;
                    
                    const guest = {
                        id: code,
                        salutation: (row['Salutation'] || '').toString().trim(),
                        name: (row['Full Name'] || '').toString().trim(),
                        position: (row['Title / Position'] || '').toString().trim(),
                        company: (row['Organization / Company'] || '').toString().trim(),
                        createdAt: new Date()
                    };
                    guests.push(guest);
                })
                .on('end', resolve)
                .on('error', reject);
        });
        
        // Insert guests into MongoDB
        if (guests.length > 0) {
            await db.collection('guests').insertMany(guests);
            console.log(`✅ Inserted ${guests.length} guests into database`);
        }
        
        // Create indexes
        await db.collection('guests').createIndex({ id: 1 }, { unique: true });
        await db.collection('checkins').createIndex({ id: 1 }, { unique: true });
        await db.collection('checkins').createIndex({ timestamp: -1 });
        console.log('📊 Created database indexes');
        
        console.log('🎉 Database seeding completed successfully!');
        
    } catch (error) {
        console.error('❌ Error seeding database:', error);
        process.exit(1);
    } finally {
        process.exit(0);
    }
}

// Run if called directly
if (require.main === module) {
    seedDatabase();
}

module.exports = seedDatabase;
