export const mockMatchData = {
  id: "match_124",
  league: "SEMIFINAL WORLD CUP 2026",
  status: "LIVE",
  minute: 12,
  homeTeam: {
    name: "Prancis",
    shortName: "FRA",
    logo: "https://media.api-sports.io/football/teams/2.png",
    score: 0,
    scorers: []
  },
  awayTeam: {
    name: "Spanyol",
    shortName: "ESP",
    logo: "https://media.api-sports.io/football/teams/9.png",
    score: 1,
    scorers: ["Lamine Yamal 8'"]
  },
  venue: "Allianz Arena, Munich",
  commentary: [
    { minute: 12, type: "info", text: "Spanyol terus menguasai bola di area pertahanan Prancis." },
    { minute: 8, type: "goal", text: "GOOOL! Prancis 0 - 1 Spanyol. Lamine Yamal mencetak gol fantastis dari luar kotak penalti!" },
    { minute: 5, type: "info", text: "Peluang untuk Prancis! Sundulan Mbappe masih melambung di atas mistar." },
    { minute: 1, type: "info", text: "Kick-off babak pertama dimulai!" }
  ]
};
