export const similars = `1, 13, 35, 46, 55, 70, 85
2, 21, 50, 56, 65, 71
3, 23, 52, 83
4, 80
5, 9, 10
6, 7
11, 34
14, 60
15, 45
17, 39
19, 31, 74
24, 57, 84
26, 47, 59, 63
27, 58
28, 82
29, 68
30, 87
33, 79
38, 77, 86
41, 62
43, 69
44, 66
53, 73
54, 81
61, 90
64, 37
76, 44`.split('\n').map(x=>x.split(',').map(y=>Number(y.trim())-1));

const fixedSimilars = [
  'Decentralized governance ensures long-term d/acc city viability.',
  'Modular infrastructure enables adaptive, resilient urban futures.',
  'Resilient infrastructure empowers decentralized, permanent urban futures.',
  'Decentralized resource access ensures resilience and equity.',
  'Community autonomy demands decentralized, not hierarchical, governance.',
  'Integrate ecological sustainability and social equity from inception.',
  'Embrace Bitcoin for sound money and fractional land ownership.',
  'Sustainable self-sufficiency demands balanced, rapid innovation.',
  'Adaptability ensures long-term viability, not rigid plans.',
  'Decentralize governance to empower resilient, community-owned cities.',
  'Cryptocurrency decentralizes urban resource management and governance.',
  'Foster a culture where diverse talent drives innovation.',
  'Design for circularity: Maximize resources, minimize pop-up city impact.',
  'Community ownership fuels adaptive, long-term pop-up governance.',
  'DAOs: Decentralized governance for city resources and evolution.',
  'Decentralization balances autonomy with sustainable governance.',
  'DAO-governed survival needs diverse, decentralized revenue.',
  'Decentralized infrastructure empowers self-governance.',
  'Modular designs foster adaptable infrastructure for evolving needs.',
  'Adaptive systems balance resource use with evolving needs.',
  'Resilient resource loops ensure viable, sustainable autonomy.',
  'Decentralized, dynamic governance evolves thriving communities.',
  'Decentralized governance: adaptable resilience, avoiding urban ossification.',
  'Planned obsolescence is key to long-term survival.',
  'Radical self-reliance builds permanent, decentralized cities.',
  'Tokenomics incentivize pop-up city resource sustainability.',
  'Decentralized governance fosters adaptability and evolution.'
];



export const sis = [
  [
    'Scalable governance is key for permanent d/acc city viability.',
    'Focus on modular infrastructure for adaptive urban growth.',
    'Decentralized energy production ensures long-term city resilience.'
  ],
  [
    'Decentralized resource networks ensure equitable access and long-term viability.',
    'Mutual aid structures replace hierarchical governance for community autonomy.',
    'Temporary infrastructure must integrate permaculture for ecological sustainability.'
  ],
  [
    'Prioritize ecological sustainability and social equity from the outset.',
    'Guaranteed basic income crucial for resident self-determination.',
    'Community-led governance is key, not top-down planning.'
  ],
  [
    'Radical self-governance tech: DAO or GTFO.',
    'Tokenized land ownership: fractionalize or die.',
    'Build vertically, farm algae, defy zoning.'
  ],
  [
    'Decentralized governance is key for a permanent d/acc pop-up city.',
    'Technological innovation must drive sustainability and self-sufficiency.',
    'Prioritize adaptability over rigid planning for long-term viability.'
  ],
  [
    'Leverage indigenous knowledge for sustainable, contextualized solutions.',
    'Decentralize governance, empower local communities within the city.',
    'Embrace a dynamic, adaptable cultural identity reflecting diverse origins.'
  ],
  [
    'Leverage blockchain for decentralized governance and resource management.',
    'Incorporate art and culture as core infrastructure.',
    'Prioritize adaptable, modular, and sustainable designs.'
  ],
  [
    'Secure long-term funding through decentralized, yield-generating governance tokens.',
    'Prioritize resilient, self-sufficient infrastructure minimizing external dependencies.',
    'Cultivate a vibrant, adaptable culture attracting diverse, innovative residents.'
  ],
  [
    'Regenerative finance models are vital for long-term pop-up city viability.',
    "Incorporate circular economy principles into the pop-up city's infrastructure.",
    'Community ownership is key to sustained pop-up city governance.'
  ],
  [
    'DAOs must govern resource allocation and city evolution.',
    'Radical decentralization protects autonomy and fosters innovation.',
    'Permanent existence demands economic self-sufficiency, DAO-governed.'
  ],
  [
    'Cryptocurrency unlocks decentralized resource management for resilient communities.',
    'Regenerative agriculture forms the economic and ecological base of the city.',
    'Open-source technology drives self-governance and adaptive infrastructure.'
  ],
  [
    'Bitcoin is the only sound money; a city must embrace it fully.',
    'Decentralized governance enforced via smart contracts is essential for true permanence.',
    "Energy independence, preferably nuclear, secures Bitcoin mining and city survival, y'all."
  ],
  [
    'Tokenomics aligns incentives for sustainable resource management in a d/acc city.',
    'Modular architecture enables rapid construction and adaptation to changing climate conditions.',
    'Decentralized governance ensures community ownership and long-term resilience.'
  ],
  [
    'Smart contract governance enables decentralized, self-sustaining urban infrastructure.',
    'Dynamic resource allocation maximizes efficiency, minimizing ecological impact.',
    'Proof-of-stake secures long-term viability; citizen participation drives evolution.'
  ],
  [
    'Permanent autonomy requires diversified, resilient resource loops.',
    'Decentralized governance prevents stagnation, fosters community evolution.',
    'Embrace impermanence: adaptability ensures long-term "permanent" viability.'
  ],
  [
    'Decentralized governance is crucial for long-term city sustainability.',
    'Prioritize circular economy principles from initial design phase.',
    'Cultivate a strong, shared digital identity for permanent residents.'
  ],
  [
    'Incentivize initial inhabitants with digital dividends tied to city growth.',
    'Prioritize adaptable, decentralized infrastructure for resilience and scalability.',
    'Integrate physical and digital layers for immersive user experiences.'
  ],
  [
    'Permanent d/acc pop-ups require resilient, redundant infrastructure.',
    'Decentralized governance avoids ossification in a "permanent" pop-up.',
    'True permanence means embracing planned obsolescence and renewal.'
  ],
  [
    'Decentralized governance is crucial for long-term d/acc city viability.',
    'Modular, adaptable infrastructure ensures resilience and future growth.',
    'Cultivate a strong, shared ethos prioritizing innovation and freedom.'
  ],
  [
    'Modular governance ensures long-term adaptability and community ownership.',
    'Circular economies maximize resource utilization, minimizing environmental impact.',
    'Balancing rapid innovation with sustainable infrastructure is paramount.'
  ],
  [
    'Radical self-governance unlocks sustainable d/acc city permanence.',
    'Dynamic infrastructure adapts to evolving human needs perpetually.',
    'Prioritize resource circularity for long-term ecological viability.'
  ],
  [
    'Incentivize sustainable resource management within the pop-up city.',
    'Modular infrastructure enables adaptability for long-term permanence.',
    'Dynamic governance fosters community evolution beyond initial design.'
  ],
  [
    'Cybersecurity is paramount; resilience against surveillance and interference crucial.',
    'Autonomous governance, decentralized power structures are fundamental for longevity.',
    'Environmental sustainability is inseparable from permanent viability, resource management.'
  ],
  [
    'Decentralized governance is critical for sustainable pop-up city permanence.',
    'Modular infrastructure allows adaptable, long-term pop-up city growth.',
    'Cultivate a strong shared identity to anchor transient pop-up populations.'
  ],
  [
    'Decentralized governance fosters resilient, adaptable urban ecosystems.',
    'Cryptocurrency enables autonomous economic systems within the city.',
    'Psychedelic integration enhances community and ecological harmony.'
  ],
  [
    'Distributed governance is key for long-term adaptability.',
    'Modularity enables organic city growth and resilience.',
    'Balancing digital and physical needs ensures true permanence.'
  ],
  [
    'Decentralized autonomous infrastructure is key to lasting autonomy.',
    'Guaranteed resource access prevents collapse, enables permanence.',
    'Iterative adaptation to threats ensures long-term survivability.'
  ],
  [
    'On-chain governance ensures decentralized resource allocation and city evolution.',
    'Sustainable infrastructure, both physical and digital, is paramount for permanence.',
    'Attract diverse, skilled contributors with clear economic and creative opportunities.'
  ],
  [
    'Decentralized governance enables long-term viability of pop-up cities.',
    'Adaptive infrastructure must be designed for evolving community needs.',
    'Financial sustainability requires diverse, decentralized revenue streams.'
  ],
  [
    'Vibe-checked governance sustains permanent d/acc cities, not just tech.',
    'Permanent d/acc cities require deliberate meme engineering and aesthetic cohesion.',
    'Radical self-reliance fosters resilience and permanence, ditching centralized cope.'
  ]
]


export const flatSis = sis.flat();


const toRemove = similars.flat();
const splicedSis = flatSis.filter((x, i) => !toRemove.includes(i));

export const sisForSign = [...fixedSimilars, ...splicedSis];

export const signsByCharacter = 
[
  [
     0,  1,  2,  3,  4,  5,
     8,  9, 11, 13, 14, 15,
    16, 21, 22
  ],
  [
     2,  3,  4,  5,  8,  9,
    11, 13, 17, 21, 22, 24,
    27, 29, 34
  ],
  [
     0,  1,  3,  4,  5,  8,
     9, 11, 12, 15, 21, 22,
    26, 27, 30
  ],
  [
     0,  6, 10, 14, 16, 25,
    28, 32, 33, 35, 36, 39,
    43, 45, 46
  ],
  [
     0,  1,  2,  3,  5,  8,
     9, 11, 12, 15, 18, 21,
    22, 26, 30
  ],
  [
     0,  1,  2,  3,  4,  5,
     8,  9, 11, 15, 21, 22,
    29, 30, 34
  ],
  [
     0,  1,  4,  5,  9, 11,
    12, 14, 15, 21, 26, 30,
    31, 45, 46
  ],
  [
     0,  2,  4,  6,  9, 14,
    16, 21, 22, 25, 26, 27,
    32, 35, 45
  ],
  [
     5,  9, 12, 14, 15, 20,
    21, 22, 26, 29, 33, 34,
    44, 45, 46
  ],
  [
     0,  4,  9, 13, 14, 15,
    16, 21, 22, 26, 32, 36,
    37, 45, 46
  ],
  [
     5,  6, 12, 14, 20, 21,
    22, 25, 29, 33, 34, 36,
    43, 44, 45
  ],
  [
     0,  2,  4,  6,  9, 10,
    13, 14, 16, 22, 24, 26,
    35, 36, 41
  ],
  [
     0,  1,  2,  3,  4,  5,
     7,  9, 10, 12, 14, 15,
    16, 20, 25
  ],
  [
     0,  1,  2,  4,  5,  8,
     9, 12, 14, 15, 16, 18,
    21, 22, 26
  ],
  [
     0,  2,  3,  5,  8, 11,
    12, 13, 15, 19, 20, 21,
    29, 30, 31
  ],
  [
     0,  1,  2,  3,  4,  5,
     9, 10, 13, 14, 15, 16,
    21, 22, 26
  ],
  [
     0,  1,  2,  3,  5,  7,
     8, 11, 14, 16, 19, 20,
    21, 25, 33
  ],
  [
     1,  2,  3,  5,  8, 11,
    12, 15, 18, 19, 20, 22,
    29, 41, 44
  ],
  [
     0,  1,  2,  4,  5,  9,
    12, 14, 15, 18, 21, 22,
    25, 29, 33
  ],
  [
     0,  1,  2,  3,  4,  5,
     8,  9, 12, 14, 15, 16,
    21, 22, 26
  ],
  [
     0,  2,  3,  5,  9, 12,
    14, 16, 20, 21, 25, 29,
    33, 34, 46
  ],
  [
     0,  1,  2,  4,  5,  9,
    12, 14, 15, 21, 22, 26,
    33, 34, 41
  ],
  [
     2,  3,  4,  5,  8,  9,
    11, 15, 16, 21, 22, 29,
    33, 41, 45
  ],
  [
     0,  1,  2,  3,  4,  5,
     8,  9, 12, 14, 15, 18,
    19, 22, 26
  ],
  [
     0,  1,  2,  4,  5,  9,
    11, 14, 15, 21, 22, 30,
    31, 43, 45
  ],
  [
     0,  1,  2,  4,  5,  8,
     9, 12, 14, 15, 18, 21,
    22, 26, 34
  ],
  [
     0,  1,  2,  3,  5,  8,
     9, 12, 14, 15, 21, 22,
    25, 29, 41
  ],
  [
     1,  2,  3,  5,  7,  9,
    12, 15, 16, 19, 21, 26,
    29, 33, 44
  ],
  [
     0,  1,  2,  3,  4,  5,
     8,  9, 12, 14, 15, 21,
    22, 26, 34
  ],
  [
     0,  6,  7, 11, 13, 16,
    21, 25, 28, 30, 31, 35,
    43, 45, 46
  ]
];

const siSignTally = {};
for(let signs of signsByCharacter) {
  for(let index of signs) {
    if(!(index in siSignTally)) {
      siSignTally[index] = 1;
    } else {
      siSignTally[index]++;
    }
  }
}
export const sortedSigns = Object.entries(siSignTally)
  .map(([key, tally]) => ({ key, tally }))
  .sort((a, b) => b.tally - a.tally);

export const top12 = sortedSigns.slice(0,12);

// console.log(top12);
// console.log(top12[11].key,sisForSign[top12[11].key]);


export const scoresByCharacter = [
  [
    7, 8, 6, 9, 5,
    7, 8, 9, 6, 8,
    4, 7
  ],
  [
    10,  9, 8, 10,  7,
     9,  8, 6,  7, 10,
     5, 10
  ],
  [
    9, 7, 6, 8, 7,
    8, 9, 6, 7, 9,
    8, 9
  ],
  [
    9, 10,  7, 8, 6,
    5,  9, 10, 7, 8,
    4,  9
  ],
  [
    8, 6, 5, 7, 4,
    9, 7, 3, 6, 5,
    8, 9
  ],
  [
    9, 7, 4, 10, 8,
    6, 5, 8,  9, 7,
    3, 9
  ],
  [
    7, 9, 6, 8, 3,
    7, 8, 9, 5, 4,
    6, 8
  ],
  [
    2, 9,  7, 4, 6,
    8, 3, 10, 5, 1,
    7, 6
  ],
  [
    10, 9, 7, 10, 8,
     6, 7, 9,  8, 5,
    10, 9
  ],
  [
    3, 10,  9, 10,  4,
    8,  9, 10,  2, 10,
    1,  9
  ],
  [
     9, 7, 6, 8, 8,
     7, 8, 9, 8, 9,
    10, 8
  ],
  [
    1,  1, 1, 1, 1,
    1,  1, 1, 1, 1,
    1, 10
  ],
  [
    9, 7, 6, 8, 5,
    9, 7, 8, 6, 7,
    9, 8
  ],
  [
    2,  6, 4, 7, 3,
    9,  5, 8, 1, 7,
    4, 10
  ],
  [
    9, 7, 5, 8,  6,
    8, 7, 4, 9, 10,
    9, 8
  ],
  [
    7, 9, 6, 8, 9,
    7, 8, 9, 8, 7,
    6, 9
  ],
  [
    4, 9, 6, 8, 5,
    7, 6, 9, 7, 5,
    3, 8
  ],
  [
    6, 3, 4, 7, 5,
    8, 2, 6, 9, 1,
    5, 7
  ],
  [
    9, 7, 6, 8, 5,
    7, 8, 6, 7, 9,
    4, 8
  ],
  [
    3, 7, 6, 7, 5,
    8, 8, 9, 6, 7,
    4, 9
  ],
  [
    7, 9, 6, 8, 4,
    7, 5, 8, 6, 3,
    9, 7
  ],
  [
    3, 8, 6, 9, 4,
    7, 7, 8, 5, 6,
    2, 9
  ],
  [
    9, 7, 6, 8, 8,
    7, 9, 6, 7, 8,
    5, 9
  ],
  [
    7, 9, 6, 8, 5,
    7, 4, 8, 6, 9,
    3, 7
  ],
  [
    9, 7, 6, 8, 4,
    7, 6, 8, 5, 9,
    3, 8
  ],
  [
    9, 8, 6, 10, 7,
    8, 9, 7, 10, 9,
    6, 8
  ],
  [
    9, 6, 4, 8, 7,
    5, 9, 7, 8, 6,
    3, 9
  ],
  [
     9, 6, 3, 7, 8,
     5, 4, 7, 9, 2,
    10, 6
  ],
  [
    9, 7, 6, 8, 5,
    7, 9, 8, 6, 4,
    3, 7
  ],
  [
    7,  9, 4, 8, 6,
    5, 10, 3, 7, 2,
    9,  6
  ]
];

// console.log(scoresByCharacter.map(x=>x.join(',')).join('\n'));
