const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/customized-coats';

console.log('Attempting to connect to MongoDB...');
console.log('Connection string:', MONGODB_URI.replace(/\/\/.*@/, '//***:***@')); // Hide credentials if any

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ Successfully connected to MongoDB!');
    console.log('Database name:', mongoose.connection.name);
    console.log('Host:', mongoose.connection.host);
    console.log('Port:', mongoose.connection.port);
    
    // List all collections
    mongoose.connection.db.listCollections().toArray()
      .then(collections => {
        console.log('\nCollections in database:');
        if (collections.length === 0) {
          console.log('  (No collections found - database is empty)');
        } else {
          collections.forEach(col => {
            console.log(`  - ${col.name}`);
          });
        }
        
        mongoose.connection.close();
        console.log('\n✅ Connection test completed successfully!');
        process.exit(0);
      })
      .catch(err => {
        console.error('Error listing collections:', err);
        mongoose.connection.close();
        process.exit(1);
      });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    console.error('\nTroubleshooting tips:');
    console.error('1. Make sure MongoDB service is running');
    console.error('2. Check if MongoDB is installed');
    console.error('3. Verify the connection string is correct');
    console.error('4. Check firewall settings');
    process.exit(1);
  });


