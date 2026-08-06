import { initializeApp } from 'firebase/app'
import { getDatabase } from 'firebase/database'

const firebaseConfig = {
  apiKey: 'AIzaSyCRbpE_6-2V1YhxmK16kxTq95kzTwPcgQY',
  authDomain: 'pxg-atlas.firebaseapp.com',
  databaseURL: 'https://pxg-atlas-default-rtdb.firebaseio.com',
  projectId: 'pxg-atlas',
  storageBucket: 'pxg-atlas.firebasestorage.app',
  messagingSenderId: '18432867386',
  appId: '1:18432867386:web:cef990e344496bc7c08903',
}

const app = initializeApp(firebaseConfig)

export const database = getDatabase(app)
