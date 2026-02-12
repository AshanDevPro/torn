const MongoClient = require('mongodb').MongoClient;

// Default connection string for local mongo process on VPS
const url = 'mongodb://127.0.0.1:27017/torn';
const client = new MongoClient(url, { useUnifiedTopology: true });

async function makeAdmin(username) {
    if (!username) {
        console.log("❌ Error: Please provide a username.");
        console.log("Usage: node tools/make_admin.js <username>");
        process.exit(1);
    }

    try {
        await client.connect();
        console.log("✅ Connected to database");

        const db = client.db('torn');
        const players = db.collection('players');

        // Check if player exists
        const player = await players.findOne({ _id: username });

        if (!player) {
            console.log(`❌ Error: Player '${username}' not found.`);
            console.log("   --> Please REGISTER an account in the game first!");
            console.log("   --> Guests cannot be made admins.");
            process.exit(1);
        }

        // Update the player tag to 'O' (Owner) which gives all permissions
        const result = await players.updateOne(
            { _id: username },
            { $set: { tag: "O", isDeveloper: true } }
        );

        console.log(`🎉 Success! Player '${username}' is now an Owner (Tag: O).`);
        console.log("   --> They also have isDeveloper: true set automatically.");
        console.log("   --> Please REFRESH/RELOG in the game for changes to take effect.");

    } catch (err) {
        console.error("❌ Database Error:", err);
    } finally {
        await client.close();
    }
}

// Get username from command line arguments
const userToPromote = process.argv[2];
makeAdmin(userToPromote);
