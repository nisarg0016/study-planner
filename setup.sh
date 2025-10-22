#!/bin/bash

# Study Planner Setup Script
echo "🚀 Setting up Study Planner Application..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js v14+ and try again."
    exit 1
fi

echo "✅ Prerequisites check passed!"

# Setup Backend
echo "📦 Setting up backend..."
cd backend

if [ ! -f .env ]; then
    echo "📝 Creating environment file..."
    cp .env.example .env
    echo "✅ Environment file created with SQLite configuration"
else
    echo "✅ Environment file already exists"
fi

echo "📦 Installing backend dependencies..."
npm install

echo "🗄️ Setting up SQLite database..."
npm run setup-db

cd ..

# Setup Frontend
echo "📦 Setting up frontend..."
cd frontend

echo "📦 Installing frontend dependencies..."
npm install

cd ..

echo "🎉 Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Start backend: cd backend && npm run dev"
echo "2. Start frontend: cd frontend && npm start"
echo ""
echo "🌐 Application will be available at:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:5000"
echo ""
echo "🔑 Demo account credentials:"
echo "   Email: demo@studyplanner.com"
echo "   Password: password123"
echo ""
echo "📚 Check README.md for detailed documentation!"