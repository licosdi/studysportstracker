#!/bin/bash

echo "🚀 Setting up Study Tracker..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed!"
    echo "Please install Node.js from https://nodejs.org/"
    echo ""
    echo "Recommended: Use nvm (Node Version Manager)"
    echo "  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash"
    echo "  nvm install --lts"
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo "✅ npm version: $(npm --version)"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo ""
echo "🗄️  Initializing database..."
npm run migrate

if [ $? -ne 0 ]; then
    echo "❌ Failed to initialize database"
    exit 1
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "🎉 You're ready to start!"
echo ""
echo "To start the development server:"
echo "  npm run dev"
echo ""
echo "Then open your browser to:"
echo "  http://localhost:3000"
echo ""
