"use client";
import { useState, useEffect } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { messaging, db } from '../lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

const VAPID_KEY = 'BDDgmPbBZIr4P0eY-xblZ_43AMWwBQWbiRuGmJWwrkP62R0qyIYC1brgJTd4TpmxchL5EO3bwXpFVjFkQFbzbj0';

export const usePushNotifications = () => {
  const [permission, setPermission] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'default');
  const [token, setToken] = useState(null);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Check if running in browser and if push is supported
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && messaging) {
      setIsSupported(true);
      
      // If already granted, we might want to get the token or just wait until requested
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        // Option to automatically get token on load if granted
        // requestPermission(); 
      }
    }
  }, []);

  useEffect(() => {
    if (!messaging) return;
    
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('Message received in foreground:', payload);
      // Optional: show a custom in-app toast for foreground messages
    });
    
    return () => unsubscribe();
  }, []);

  const requestPermission = async () => {
    try {
      if (!isSupported) {
        console.warn('Push notifications are not supported in this browser.');
        return false;
      }

      if (typeof Notification === 'undefined') {
        return false;
      }

      console.log('Requesting permission...');
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult === 'granted') {
        console.log('Notification permission granted.');
        const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY });
        
        if (currentToken) {
          console.log('FCM Token retrieved:', currentToken);
          setToken(currentToken);
          await saveTokenToFirestore(currentToken);
          return true;
        } else {
          console.log('No registration token available. Request permission to generate one.');
          return false;
        }
      } else {
        console.log('Notification permission not granted.');
        return false;
      }
    } catch (error) {
      console.error('An error occurred while retrieving token:', error);
      return false;
    }
  };

  const saveTokenToFirestore = async (currentToken) => {
    try {
      // Use the token as the document ID so we don't have duplicates
      const tokenRef = doc(db, 'pushSubscribers', currentToken);
      await setDoc(tokenRef, {
        token: currentToken,
        userAgent: navigator.userAgent,
        updatedAt: serverTimestamp()
      }, { merge: true });
      console.log('Token saved to Firestore');
    } catch (error) {
      console.error('Error saving token to Firestore:', error);
    }
  };

  return { permission, requestPermission, token, isSupported };
};
