const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

initializeApp({
  projectId: "pionerhouse-app"
});

async function run() {
  const db = getFirestore();
  await db.collection("live_matches").doc("current").set({
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
