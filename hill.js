import {readFileSync} from 'node:fs';

const raw = readFileSync('./hillclimbold.csv', 'utf8');
const rows = raw.split('\n').slice(1,-1).map(x=>x.split(','));
if(rows.length!== 30) throw new Error('invalid python result!');

const colorMap = {};
for(let row of rows) {
  const rowColors = row[1].split('-');
  colorMap[rowColors[0]] = row[2];
  colorMap[rowColors[1]] = row[3];
}

export const schedule = [
  [ letterToIndex(colorMap['White']), letterToIndex(colorMap['Black']) ],
  [ letterToIndex(colorMap['Red']), letterToIndex(colorMap['Dark Blue']) ],
  [ letterToIndex(colorMap['Orange']), letterToIndex(colorMap['Silver']) ],
  [ letterToIndex(colorMap['Purple']), letterToIndex(colorMap['Brown']) ],
  [ letterToIndex(colorMap['Light Blue']), letterToIndex(colorMap['Yellow']) ],
  [ letterToIndex(colorMap['Green']), letterToIndex(colorMap['Gold']) ],
];

export const charSessions = [];
function letterToIndex(letter) {
  return letter.charCodeAt(0) - 65;
}
for(let row of rows) {
  charSessions[Number(row[0])-1] = {
    topic1: letterToIndex(row[2]),
    topic2: letterToIndex(row[3]),
    critic1: letterToIndex(colorMap[row[4]]),
    critic2: letterToIndex(colorMap[row[5]]),
  };
}

export const topicParticipants = Array(12).fill(0).map(x=>({
  participants: [],
  critics: []
}));

for(let i = 0; i < charSessions.length; i++) {
  topicParticipants[charSessions[i].topic1].participants.push(i);
  topicParticipants[charSessions[i].topic2].participants.push(i);
  topicParticipants[charSessions[i].critic1].critics.push(i);
  topicParticipants[charSessions[i].critic2].critics.push(i);
}
console.log(schedule);
console.log(topicParticipants);

for(let sesh of schedule) {
  const topic1 = [
    ...topicParticipants[sesh[0]].participants,
    ...topicParticipants[sesh[0]].critics,
  ];
  const topic2 = [
    ...topicParticipants[sesh[1]].participants,
    ...topicParticipants[sesh[1]].critics,
  ];
  if(haveCommonElement(topic1, topic2)) {
    throw new Error('concurrency conflict!');
  }

}

function haveCommonElement(arr1, arr2) {
  const set1 = new Set(arr1);
  for (const num of arr2) {
    if (set1.has(num)) {
      return true;
    }
  }
  return false;
}
