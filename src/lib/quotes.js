const QUOTES = [
  "Not every game is about winning — some are about the company.",
  "The numbers didn't fall your way today. There's always the next house.",
  "You played every number right. Luck just had other plans.",
  "No award this time, but you kept the room laughing. That counts too.",
  "Close doesn't win Tambola, but it makes for a good story after.",
  "Some days the dabber just isn't with you. Shuffle again soon.",
  "You showed up, you marked your numbers, you had fun. That's the game.",
  "The house always has next time.",
];

export function randomQuote() {
  return QUOTES[Math.floor(Math.random() * QUOTES.length)];
}
