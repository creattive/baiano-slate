# Digital Slate - Professional Film Production Tool

A comprehensive digital slate application for film and video production, featuring real-time timecode, take logging, and collaborative features.

## Features

- **Real-time Timecode**: Live timecode display with manual override capability
- **Take Management**: Log takes with scene, take number, roll, and detailed notes
- **Tag System**: Categorize takes with customizable tags (Good Take, Problem, Check Audio, etc.)
- **Project Information**: Track script title, director, recording date, and script supervisor
- **Export Reports**: Generate CSV and TXT reports for post-production
- **Real-time Sync**: Firebase integration for multi-device collaboration
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## Setup Instructions

### 1. Firebase Configuration

1. Create a new Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Firestore Database
3. Enable Authentication with Anonymous sign-in
4. Copy your Firebase configuration

### 2. Environment Variables

1. Copy `.env.example` to `.env.local`
2. Fill in your Firebase configuration values:

\`\`\`env
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=your-firebase-app-id
\`\`\`

### 3. Installation

\`\`\`bash
npm install
npm run dev
\`\`\`

### 4. Production Deployment

\`\`\`bash
npm run build
npm start
\`\`\`

## Usage

1. **Project Setup**: Fill in project information (script title, director, etc.)
2. **Timecode**: Monitor live timecode or set manual timecode for sync
3. **Take Logging**: Enter scene, take, roll, and notes
4. **Tags**: Use predefined tags or create custom ones to categorize takes
5. **Export**: Generate reports in CSV or TXT format for post-production

## Firebase Security Rules

Add these Firestore security rules:

\`\`\`javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /artifacts/digital-slate-app/users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
\`\`\`

## Production Considerations

- Set up proper Firebase security rules
- Configure Firebase hosting or deploy to Vercel
- Set up monitoring and analytics
- Consider implementing user authentication for multi-user scenarios
- Add backup and data export features for long-term storage

## License

This project is licensed under the MIT License.
