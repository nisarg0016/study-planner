#!/usr/bin/env node
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const dbPath = process.env.DB_PATH || path.join(__dirname, '../database/study_planner.db');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function resetDatabase() {
  console.log('\n⚠️  WARNING: This will DELETE your existing database and create a new one!\n');
  
  const answer = await askQuestion('Are you sure you want to continue? (yes/no): ');
  
  if (answer.toLowerCase() !== 'yes') {
    console.log('Database reset cancelled.');
    rl.close();
    process.exit(0);
  }
  
  try {
    // Delete existing database if it exists
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
      console.log('✓ Existing database deleted');
    }
    
    // Run setup script to create new database
    console.log('\n🔄 Creating new database...\n');
    const setupScript = require('./setupDatabase.js');
    
    console.log('\n✅ Database reset complete!');
    console.log('You can now start the server with: npm run dev\n');
    
  } catch (error) {
    console.error('❌ Error resetting database:', error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

resetDatabase();
