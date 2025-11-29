# Quick Start - Firebase Setup Checklist

Follow these steps in order to get Firebase working with your CampusBuddy app.

## ✅ Step-by-Step Checklist

### 1. Firebase Console Setup (5 minutes)
- [ ] Go to [Firebase Console](https://console.firebase.google.com/)
- [ ] Create a new project (or use existing)
- [ ] Register a web app and **copy the config values**
- [ ] Enable **Email/Password** authentication
- [ ] Create a **Firestore Database** (production mode)
- [ ] Download **Service Account Key** (JSON file)

### 2. Client Environment Variables (2 minutes)
Create `client/.env` file with:
```env
VITE_FIREBASE_API_KEY=your-api-key-here
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_API_URL=http://localhost:5000
```

### 3. Server Environment Variables (3 minutes)
Create `server/.env` file with values from the Service Account JSON:
```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY_HERE\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your-client-id
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
PORT=5000
```

**Important:** For `FIREBASE_PRIVATE_KEY`, copy the entire private key from the JSON file and replace actual newlines with `\n`

### 4. Firestore Security Rules (2 minutes)
In Firebase Console → Firestore → Rules, paste:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```
*(This is a basic rule - see FIREBASE_SETUP.md for production rules)*

### 5. Test It! (2 minutes)
```bash
# Terminal 1 - Start server
cd server
npm install
npm run dev

# Terminal 2 - Start client
cd client
npm install
npm run dev
```

Then:
- [ ] Go to http://localhost:5173/register
- [ ] Create a test account
- [ ] Check Firebase Console → Authentication (should see your user)
- [ ] Check Firestore → users collection (should see user document)
- [ ] Try logging in

## 🎯 Where to Find Each Value

| Value | Where to Find |
|-------|---------------|
| **API Key** | Firebase Console → Project Settings → General → Your apps → Web app config |
| **Auth Domain** | Same as above (usually `project-id.firebaseapp.com`) |
| **Project ID** | Same as above |
| **Storage Bucket** | Same as above (usually `project-id.appspot.com`) |
| **Messaging Sender ID** | Same as above |
| **App ID** | Same as above |
| **Service Account Values** | Firebase Console → Project Settings → Service Accounts → Generate new private key |

## 🚨 Common Mistakes

1. **Missing quotes around FIREBASE_PRIVATE_KEY** - Must be in quotes with `\n` for newlines
2. **Wrong directory for .env files** - Client `.env` goes in `client/`, server `.env` goes in `server/`
3. **Not restarting dev server** - Must restart after creating/updating `.env`
4. **Copying extra spaces** - Make sure no trailing spaces in environment variables

## 📚 Need More Details?

See `FIREBASE_SETUP.md` for comprehensive documentation.

