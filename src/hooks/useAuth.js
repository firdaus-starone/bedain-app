"use client";
import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, getDocs, limit, query } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

export const useAuth = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null); // 'reporter', 'editor', 'superadmin'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // User is logged in to Firebase Auth, now fetch their role from Firestore
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);

        let role = 'reporter'; // Default role

        if (userSnap.exists()) {
          role = userSnap.data().role;
          // Force superadmin for default redaksi email to prevent lockouts during migration
          if (user.email === 'redaksi@bedainnews.com') {
            role = 'superadmin';
          }
        } else {
          // If user doesn't exist in Firestore, check if this is the FIRST user ever
          try {
            const usersQuery = query(collection(db, 'users'), limit(1));
            const usersSnapshot = await getDocs(usersQuery);
            
            if (usersSnapshot.empty || user.email === 'redaksi@bedainnews.com') {
              // This is the very first user in the database or the official redaksi email, make them Superadmin
              role = 'superadmin';
            }
            
            // Save new user profile to Firestore
            await setDoc(userRef, {
              email: user.email,
              role: role,
              createdAt: new Date()
            });
          } catch (error) {
            console.error("Error creating user profile:", error);
          }
        }
        
        setCurrentUser(user);
        setUserRole(role);
      } else {
        setCurrentUser(null);
        setUserRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { currentUser, userRole, loading };
};
