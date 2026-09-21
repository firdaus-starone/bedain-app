const { initializeApp, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

if (getApps().length === 0) {
  initializeApp({
    projectId: "pionerhouse-app"
  });
}

async function run() {
  const db = getFirestore();
  
  const schedule = [
    {
      id: "sch_1", league: "SEMIFINAL WORLD Cup 2026", date: "2026-07-13T19:00:00Z", timestamp: 1783969200,
      homeTeam: { name: "Prancis", shortName: "FRA", logo: "https://media.api-sports.io/football/teams/2.png" },
      awayTeam: { name: "Spanyol", shortName: "ESP", logo: "https://media.api-sports.io/football/teams/9.png" }
    },
    {
      id: "sch_2", league: "SEMIFINAL WORLD CUP 2026", date: "2026-07-14T19:00:00Z", timestamp: 1784055600,
      homeTeam: { name: "Inggris", shortName: "ENG", logo: "https://media.api-sports.io/football/teams/10.png" },
      awayTeam: { name: "Argentina", shortName: "ARG", logo: "https://media.api-sports.io/football/teams/26.png" }
    }
  ];

  await db.collection("live_matches").doc("schedule").set({
    updatedAt: new Date(),
    matches: schedule
  });

  console.log("Mock match schedule written to live_matches/schedule");
}
run();
