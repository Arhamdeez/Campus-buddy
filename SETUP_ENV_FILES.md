# Environment Files Setup

Create these two `.env` files manually:

## 1. Client `.env` file

**Location:** `client/.env`

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=AIzaSyDJ1pinCeyiktUG5TpDJYfRz3ojK5voJPw
VITE_FIREBASE_AUTH_DOMAIN=campus-buddy-89408.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=campus-buddy-89408
VITE_FIREBASE_STORAGE_BUCKET=campus-buddy-89408.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=810373331024
VITE_FIREBASE_APP_ID=1:810373331024:web:131ba71dd460962803f955

# API URL
VITE_API_URL=http://localhost:5000
```

## 2. Server `.env` file

**Location:** `server/.env`

```env
# Firebase Admin SDK Configuration
FIREBASE_PROJECT_ID=campus-buddy-89408
FIREBASE_PRIVATE_KEY_ID=b71ac34995f6f04576872dbfbaeedecb90facb7a
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCWKNtR9+onqJWR\n6253Y1yGfnufalv/UF87atqvJZVyVFJhCiKJ7G4xP64T9BtQM2Tn9WO0O3Iq6Sxt\nMzbIokDlJNXpJ7eL9EX+EgwqJqEeBm62HFzGNeC2BYhHT16JwPW4UKLPi8n8QVow\nq4NXGb+l0YO5KOABclcTZy10Pj47cz1ff/TJg9NSgMeWZ/ZjYsXwQjZPd4xtYGF4\nhaxuguEjHVaZvbTz6qvqRY0TdYsX/bZ80XStvlSEaytVePenBEamLC+JJ6YncE30\nAv24ge6om1NVMJZPGje2yq6bQ1jymJ+3T4jYK8m+cddrPy0PUxvc5LlkvcmsxbHc\ndeW714PvAgMBAAECggEABLHYUZK/tme17W7/8CmiHe5cbRqFL9FSeOgZWDqDlqR+\nQtxvQgKrW0zTY3pRVEuXDw2EBYGKSz8pDWz5fIJeJwvkyDpeqbiEa7IiwTqd9PNc\niMMQP341vVsk7J3Vpdbrl8ylmnmTYhik+jqSi6mZbVTEmohloIXzpP6n1CeSCIfA\nku3Xq4NdeicP4BBAVmLtOAmjU7I75twBH1KpQlG2hELKohuXbKs/1yaRHkXem2x2\nyZLKWgIBQJusZPDANivkWHCri3xnKeyHJ4iDJ/AoEeSl9Z5d+r8TZSCMIDfBwJlC\nIUGp/Mj+hWOZJSfyAezdU9P3BISSbvT1szU6o4CYiQKBgQDJES2ZPIzS+buNvUmy\nvX7ZcVyvRLTEIg3Rf5Q87gYUPjyyO8yXzQwRCnEYrHQTJVpU97ny8pRaJj+HExhw\nB2cYyDMRoFbhzVYvLjYk2gzLK31EhYTofTry1u8gh5IYc79AK6RgO2iNrOe3mDLc\nZLqNpll4HmZ96NcHqldYNHlo4wKBgQC/Lyjtj1WU1aRdELNEMWoIXI5mRCmoTFVw\nMnEs6XCTrN3IHLIT/63wqE5cjxzYXTPItv7HOO7Zbqv0JL+W4DHKv7xl+tAvojr4\nKKsnBkYpGtNc3V+EM3FOGDZaoaNDMyJ/F0BOKbI0Zju4h9LSnn4pbPsYPAW3hYnh\nxc5cdhjChQKBgC0bC22q5bSWjXqYkiXk2MYS5kXzVdICCbOLuUeJ5hc4dwlM3PLY\n7vILs59jYI7C/Ga/RBm6TYmDtxCoOf03y+sFTl+P5q21ELZ42XCe8evKD8oFYfF9\n1nGPwgk8IIwXuzm8EJ399dCCj2DiZdaHSkponP2TZE6uoz52+i0xaGMdAoGAdiP8\nVKCIMAq9IM1bGb63WSdoz4U7gMZ63XQuP6SZbogaHLiuynDq2ZYHpmbBWmptv5Bl\nbFKgNjiPhbTXt7Ie0r0c/J+62lSTwBnRebIE1Q3AotghWB453BpWLDdKHhKRNJv3\nntVhS8QJD4TPIFvUdmDj4RvmJHwesid71+MadckCgYAWWzACVogY27QAcQG9uhYt\nkU1bKYtGDRtmGdiYhsLJoABSy919w0WypNDgbC5OSzq8UJI71WfIap0YQQ/a8/+u\nvdAq3q8BHrxFgw1m3iNZvyBsg/HscqI8ZQmuunmN+If1BqGpWO7Yf22PPzo4BcVI\nNkFZ34FfMU3WkXULxJIaxw==\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@campus-buddy-89408.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=114770227798810823759
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token

# Server Configuration
PORT=5000
NODE_ENV=development
```

## Quick Setup Commands

You can create these files using terminal commands:

### For Client:
```bash
cd client
cat > .env << 'EOF'
# Firebase Configuration
VITE_FIREBASE_API_KEY=AIzaSyDJ1pinCeyiktUG5TpDJYfRz3ojK5voJPw
VITE_FIREBASE_AUTH_DOMAIN=campus-buddy-89408.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=campus-buddy-89408
VITE_FIREBASE_STORAGE_BUCKET=campus-buddy-89408.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=810373331024
VITE_FIREBASE_APP_ID=1:810373331024:web:131ba71dd460962803f955

# API URL
VITE_API_URL=http://localhost:5000
EOF
```

### For Server:
```bash
cd server
cat > .env << 'EOF'
# Firebase Admin SDK Configuration
FIREBASE_PROJECT_ID=campus-buddy-89408
FIREBASE_PRIVATE_KEY_ID=b71ac34995f6f04576872dbfbaeedecb90facb7a
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCWKNtR9+onqJWR\n6253Y1yGfnufalv/UF87atqvJZVyVFJhCiKJ7G4xP64T9BtQM2Tn9WO0O3Iq6Sxt\nMzbIokDlJNXpJ7eL9EX+EgwqJqEeBm62HFzGNeC2BYhHT16JwPW4UKLPi8n8QVow\nq4NXGb+l0YO5KOABclcTZy10Pj47cz1ff/TJg9NSgMeWZ/ZjYsXwQjZPd4xtYGF4\nhaxuguEjHVaZvbTz6qvqRY0TdYsX/bZ80XStvlSEaytVePenBEamLC+JJ6YncE30\nAv24ge6om1NVMJZPGje2yq6bQ1jymJ+3T4jYK8m+cddrPy0PUxvc5LlkvcmsxbHc\ndeW714PvAgMBAAECggEABLHYUZK/tme17W7/8CmiHe5cbRqFL9FSeOgZWDqDlqR+\nQtxvQgKrW0zTY3pRVEuXDw2EBYGKSz8pDWz5fIJeJwvkyDpeqbiEa7IiwTqd9PNc\niMMQP341vVsk7J3Vpdbrl8ylmnmTYhik+jqSi6mZbVTEmohloIXzpP6n1CeSCIfA\nku3Xq4NdeicP4BBAVmLtOAmjU7I75twBH1KpQlG2hELKohuXbKs/1yaRHkXem2x2\nyZLKWgIBQJusZPDANivkWHCri3xnKeyHJ4iDJ/AoEeSl9Z5d+r8TZSCMIDfBwJlC\nIUGp/Mj+hWOZJSfyAezdU9P3BISSbvT1szU6o4CYiQKBgQDJES2ZPIzS+buNvUmy\nvX7ZcVyvRLTEIg3Rf5Q87gYUPjyyO8yXzQwRCnEYrHQTJVpU97ny8pRaJj+HExhw\nB2cYyDMRoFbhzVYvLjYk2gzLK31EhYTofTry1u8gh5IYc79AK6RgO2iNrOe3mDLc\nZLqNpll4HmZ96NcHqldYNHlo4wKBgQC/Lyjtj1WU1aRdELNEMWoIXI5mRCmoTFVw\nMnEs6XCTrN3IHLIT/63wqE5cjxzYXTPItv7HOO7Zbqv0JL+W4DHKv7xl+tAvojr4\nKKsnBkYpGtNc3V+EM3FOGDZaoaNDMyJ/F0BOKbI0Zju4h9LSnn4pbPsYPAW3hYnh\nxc5cdhjChQKBgC0bC22q5bSWjXqYkiXk2MYS5kXzVdICCbOLuUeJ5hc4dwlM3PLY\n7vILs59jYI7C/Ga/RBm6TYmDtxCoOf03y+sFTl+P5q21ELZ42XCe8evKD8oFYfF9\n1nGPwgk8IIwXuzm8EJ399dCCj2DiZdaHSkponP2TZE6uoz52+i0xaGMdAoGAdiP8\nVKCIMAq9IM1bGb63WSdoz4U7gMZ63XQuP6SZbogaHLiuynDq2ZYHpmbBWmptv5Bl\nbFKgNjiPhbTXt7Ie0r0c/J+62lSTwBnRebIE1Q3AotghWB453BpWLDdKHhKRNJv3\nntVhS8QJD4TPIFvUdmDj4RvmJHwesid71+MadckCgYAWWzACVogY27QAcQG9uhYt\nkU1bKYtGDRtmGdiYhsLJoABSy919w0WypNDgbC5OSzq8UJI71WfIap0YQQ/a8/+u\nvdAq3q8BHrxFgw1m3iNZvyBsg/HscqI8ZQmuunmN+If1BqGpWO7Yf22PPzo4BcVI\nNkFZ34FfMU3WkXULxJIaxw==\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@campus-buddy-89408.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=114770227798810823759
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token

# Server Configuration
PORT=5000
NODE_ENV=development
EOF
```

## Important Notes

1. **The `.env` files are already in `.gitignore`** - they won't be committed to git
2. **Restart your dev servers** after creating/updating `.env` files
3. **The private key must be in quotes** with `\n` for newlines (already formatted above)

## Next Steps

After creating both `.env` files:

1. **Enable Firebase Authentication:**
   - Go to Firebase Console → Authentication → Sign-in method
   - Enable "Email/Password"

2. **Create Firestore Database:**
   - Go to Firebase Console → Firestore Database
   - Click "Create database"
   - Choose "Start in production mode"
   - Select a location

3. **Test your setup:**
   ```bash
   # Terminal 1
   cd server && npm run dev
   
   # Terminal 2
   cd client && npm run dev
   ```

4. **Visit:** http://localhost:5173/register and create a test account!

