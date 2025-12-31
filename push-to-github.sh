#!/bin/bash

echo "🚀 Pushing Study Tracker to GitHub..."
echo ""
echo "Repository: https://github.com/licosdi/studysportstracker"
echo ""

# Push to GitHub
git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Success! Your code is now on GitHub!"
    echo "🔗 View it at: https://github.com/licosdi/studysportstracker"
else
    echo ""
    echo "❌ Push failed. You may need to authenticate."
    echo ""
    echo "If you haven't already:"
    echo "1. Make sure the repository exists at https://github.com/licosdi/studysportstracker"
    echo "2. You may need a Personal Access Token (see GITHUB_SETUP.md)"
    echo ""
    echo "When prompted for password, use your Personal Access Token, not your GitHub password."
fi
