import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "pionerhouse-app"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  await setDoc(doc(db, "live_matches", "current"), {
    id: "mock_123",
    league: "PIALA DUNIA 2026",
    status: "LIVE",
    minute: 75,
    homeTeam: {
      name: "Indonesia",
      shortName: "IDN",
      logo: "https://media.api-sports.io/football/teams/4260.png",
      score: 2,
    },
    awayTeam: {
      name: "Argentina",
      shortName: "ARG",
      logo: "https://media.api-sports.io/football/teams/26.png",
      score: 1,
    }
  });
  console.log("Mock data written to live_matches/current");
}
run();
