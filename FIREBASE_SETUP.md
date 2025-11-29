# Firebase Setup Guide for CampusBuddy

This guide will walk you through setting up Firebase for your CampusBuddy application.

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"** or **"Create a project"**
3. Enter your project name (e.g., "CampusBuddy")
4. Click **Continue**
5. (Optional) Enable Google Analytics if you want it
6. Click **Create project**
7. Wait for the project to be created, then click **Continue**

## Step 2: Register Your Web App

1. In your Firebase project dashboard, click the **Web icon** (`</>`) to add a web app
2. Register your app with a nickname (e.g., "CampusBuddy Web")
3. **Do NOT** check "Also set up Firebase Hosting" (unless you want to use it)
4. Click **Register app**
5. You'll see your Firebase configuration object - **copy these values** (you'll need them later)

The config will look like this:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

## Step 3: Enable Authentication

1. In the Firebase Console, go to **Build** → **Authentication** (in the left sidebar)
2. Click **Get started**
3. Click on **Sign-in method** tab
4. Enable **Email/Password** authentication:
   - Click on **Email/Password**
   - Toggle **Enable** to ON
   - Click **Save**

## Step 4: Set Up Firestore Database

1. In the Firebase Console, go to **Build** → **Firestore Database**
2. Click **Create database**
3. Choose **Start in production mode** (we'll set up security rules later)
4. Select a location for your database (choose the closest to your users)
5. Click **Enable**

### Firestore Security Rules

After creating the database, go to the **Rules** tab and update them to:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read their own data
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Allow authenticated users to read other users (for chat, etc.)
    match /users/{userId} {
      allow read: if request.auth != null;
    }
    
    // Messages - authenticated users can read/write
    match /messages/{messageId} {
      allow read, write: if request.auth != null;
    }
    
    // Announcements - authenticated users can read, admins can write
    match /announcements/{announcementId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        (request.auth.token.role == 'admin' || request.auth.token.role == 'society_head');
    }
    
    // Lost & Found - authenticated users can read/write
    match /lost-found/{itemId} {
      allow read, write: if request.auth != null;
    }
    
    // Feedback - authenticated users can read/write
    match /feedback/{feedbackId} {
      allow read, write: if request.auth != null;
    }
    
    // Mood entries - users can only read/write their own
    match /mood/{entryId} {
      allow read, write: if request.auth != null && 
        resource.data.userId == request.auth.uid;
    }
    
    // Campus status - authenticated users can read, admins can write
    match /status/{statusId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        (request.auth.token.role == 'admin' || request.auth.token.role == 'society_head');
    }
    
    // Badges - authenticated users can read
    match /badges/{badgeId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.token.role == 'admin';
    }
  }
}
```

**Note:** For development, you can use test mode temporarily, but update to production rules before deploying.

## Step 5: Get Service Account Key (for Server)

Your server needs a service account key to use Firebase Admin SDK:

1. In Firebase Console, click the **gear icon** ⚙️ next to "Project Overview"
2. Go to **Project settings**
3. Click on the **Service accounts** tab
4. Click **Generate new private key**
5. Click **Generate key** in the confirmation dialog
6. A JSON file will download - **keep this secure!**

This file contains credentials like:
```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-...@your-project.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  ...
}
```

## Step 6: Set Up Environment Variables

### Client-side (.env file)

Create a `.env` file in the `client` directory:

```env
# Firebase Configuration (from Step 2)
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef

# API URL
VITE_API_URL=http://localhost:5000
```

### Server-side (.env file)

Create a `.env` file in the `server` directory:

```env
# Firebase Admin SDK Configuration (from Step 5 - Service Account)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-...@your-project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your-client-id
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token

# Server Configuration
PORT=5000
NODE_ENV=development
```

**Important Notes:**
- The `FIREBASE_PRIVATE_KEY` should be wrapped in quotes and include the `\n` characters
- If you're copying from the JSON file, replace actual newlines with `\n`
- Never commit these `.env` files to git!

## Step 7: Create Firestore Collections Structure

Your Firestore database will need these collections. They'll be created automatically when you use them, but here's the structure:

### Collections:
- `users` - User profiles
- `messages` - Chat messages
- `announcements` - Campus announcements
- `lost-found` - Lost and found items
- `feedback` - Anonymous feedback
- `mood` - Mood entries
- `status` - Campus status updates
- `badges` - Badge definitions
- `activities` - User activity logs

### Example User Document Structure:
```json
{
  "id": "user-uid-here",
  "name": "John Doe",
  "email": "john@example.com",
  "batch": "22L-6619",
  "role": "student",
  "profilePicture": "https://...",
  "joinedAt": 1234567890,
  "badges": [],
  "points": 0,
  "isOnline": false
}
```

## Step 8: Test Your Setup

1. **Start your server:**
   ```bash
   cd server
   npm install
   npm run dev
   ```

2. **Start your client:**
   ```bash
   cd client
   npm install
   npm run dev
   ```

3. **Test registration:**
   - Go to `http://localhost:5173/register`
   - Create a test account
   - Check Firebase Console → Authentication to see the new user
   - Check Firestore → users collection to see the user document

4. **Test login:**
   - Log out and log back in
   - Verify the token is working

## Troubleshooting

### Common Issues:

1. **"Missing required Firebase environment variables"**
   - Make sure your `.env` file is in the `client` directory
   - Restart your dev server after creating/updating `.env`

2. **"Firebase: Error (auth/invalid-api-key)"**
   - Double-check your API key in the `.env` file
   - Make sure there are no extra spaces or quotes

3. **"Permission denied" errors in Firestore**
   - Check your Firestore security rules
   - Make sure authentication is working

4. **Server can't verify tokens**
   - Check your server `.env` file has all Firebase Admin SDK credentials
   - Make sure the private key includes `\n` for newlines

5. **"User data not found" after registration**
   - Check that the user document was created in Firestore
   - Verify the `/register-complete` endpoint is being called

## Security Checklist

Before deploying to production:

- [ ] Update Firestore security rules (use the rules provided above)
- [ ] Set up proper CORS on your server
- [ ] Use environment-specific Firebase projects (dev/staging/prod)
- [ ] Never commit `.env` files
- [ ] Add `.env` to `.gitignore`
- [ ] Set up Firebase App Check for additional security
- [ ] Enable Firebase Authentication email verification (optional)
- [ ] Set up rate limiting on your server

## Additional Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firebase Auth Documentation](https://firebase.google.com/docs/auth)
- [Firestore Documentation](https://firebase.google.com/docs/firestore)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)

## Need Help?

If you encounter issues:
1. Check the browser console for client-side errors
2. Check the server logs for server-side errors
3. Verify all environment variables are set correctly
4. Make sure Firebase services are enabled in the console

