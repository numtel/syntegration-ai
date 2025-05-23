function letterToIndex(letter) {
  return letter.charCodeAt(0) - 65;
}

export function decodeOptimizer(rows) {
  const colorMap = {};
  for(let row of rows) {
    const rowColors = row.ColorPair.split('-');
    colorMap[rowColors[0]] = row.Topic1;
    colorMap[rowColors[1]] = row.Topic2;
  }

  const schedule = [
    [ letterToIndex(colorMap['White']), letterToIndex(colorMap['Black']) ],
    [ letterToIndex(colorMap['Red']), letterToIndex(colorMap['Dark Blue']) ],
    [ letterToIndex(colorMap['Orange']), letterToIndex(colorMap['Silver']) ],
    [ letterToIndex(colorMap['Purple']), letterToIndex(colorMap['Brown']) ],
    [ letterToIndex(colorMap['Light Blue']), letterToIndex(colorMap['Yellow']) ],
    [ letterToIndex(colorMap['Green']), letterToIndex(colorMap['Gold']) ],
  ];

  const charSessions = [];
  for(let row of rows) {
    charSessions[Number(row.Participant)-1] = {
      topic1: letterToIndex(row.Topic1),
      topic2: letterToIndex(row.Topic2),
      critic1: letterToIndex(colorMap[row.Critic1]),
      critic2: letterToIndex(colorMap[row.Critic2]),
    };
  }

  const topicParticipants = Array(12).fill(0).map(x=>({
    participants: [],
    critics: []
  }));

  for(let i = 0; i < charSessions.length; i++) {
    topicParticipants[charSessions[i].topic1].participants.push(i);
    topicParticipants[charSessions[i].topic2].participants.push(i);
    topicParticipants[charSessions[i].critic1].critics.push(i);
    topicParticipants[charSessions[i].critic2].critics.push(i);
  }

  // Internal consistency check
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
  return {schedule, topicParticipants};
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
