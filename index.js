import {writeFileSync} from 'node:fs';
import {bios} from './bios.3.js';
import {decodeOptimizer} from './hill.js';
import {request} from './ai.js';
import {optimizer} from './optimizer.js';

const SKIP_SUMMARY = false;


const desireRating = 'Respond with only your thoughts (no introduction of yourself) at this point in the conversation and put a number from 0-9 as the absolutely last character returned (after the last period, only the integer digit) which correlates to your desire to respond again.';

let progress = 0;
function aiRequest(prompt, maxOutputTokens) {
  console.log(prompt);
  console.log('Progress:', Math.round((progress/(3*6*2)) * 10000)/100, '%');
  return request(prompt, maxOutputTokens);
}

function extractNumberFromEnd(input) {
  const regex = /^(.*?)(?:[\(\[])?\s*(\d+)(?:[\)\].])?\s*\.?$/s;
  const match = input.match(regex);

  if (match) {
    // Normalize the prefix to end in a period if the input ends with a dot or bracketed/delimited number
    let prefix = match[1].replace(/\s+$/, ''); // Remove trailing whitespace
    if (!prefix.endsWith('.')) {
      prefix += '.';
    }

    const number = parseInt(match[2], 10);
    return [prefix, number];
  }

  // Sometimes the model doesn't respond with anything that matches
  // Just go with 5 instead of failing the entire process.
  return [input, 5];
}

function rand(max) {
  return Math.floor(Math.random() * max);
}

(async function() {
  // TODO load trigger question and bios from a file
  const triggerQuestion = `
    How to best create a d/acc pop-up city that could exist permanently?
  `;
  const characterBios = bios;

  const sis = await generateSIs(characterBios, triggerQuestion);
  const flatSis = sis.flat();
  const similars = await dupeSIs(flatSis);
  const toRemove = similars.flat();
  const splicedSis = flatSis.filter((x, i) => !toRemove.includes(i));
  const fixedSimilars = await combineSIs(flatSis, similars);

  const sisForSign = [...fixedSimilars, ...splicedSis];
  console.log(similars, fixedSimilars);
  const signsByCharacter = await signSIs(sisForSign, characterBios, triggerQuestion);
  console.log(signsByCharacter);

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
  const sortedSigns = Object.entries(siSignTally)
    .map(([key, tally]) => ({ key, tally }))
    .sort((a, b) => b.tally - a.tally);

  if(sortedSigns.length < 12) {
    console.error(sortedSigns);
    throw new Error('not enough unique SIs!');
  }
  const top12 = sortedSigns.slice(0,12);
  const scoresByCharacter = await scoreSIs(sisForSign, characterBios, top12);
  console.log(top12, scoresByCharacter);
  const rows = await optimizer(scoresByCharacter);
  console.log(rows);
  const {schedule, topicParticipants} = decodeOptimizer(rows);

  console.log(schedule);
  console.log(topicParticipants);

  const config = {
    sisForSign, top12, schedule, topicParticipants, characterBios, triggerQuestion,
  };

  const convos = [];
  for(let iteration = 0; iteration <3; iteration++) {
    for(let sessionIdx = 0; sessionIdx < 6; sessionIdx++) {
      for(let polarity = 0; polarity < 2; polarity++) {
        const seg1 = await convoSeg1(sessionIdx,polarity,convos, config);
        const critique = await convoCritique(sessionIdx,polarity,seg1,convos, config);
        const seg2 = await convoSeg2(sessionIdx,polarity,seg1, critique,convos, config);
        const convo = {
          iteration,
          index: schedule[sessionIdx][polarity],
          si: sisForSign[top12[schedule[sessionIdx][polarity]].key],
          seg1,
          critique,
          seg2,
        };
        if(!SKIP_SUMMARY) {
          convo.summary = await summarizeConvo(convo);
        }
        convos.push(convo);
        progress++;
      }
    }
  }
  writeFileSync('./out.json', JSON.stringify(convos));
  console.log('Complete!');
})();

async function summarizeConvo(convo) {
  return aiRequest(`
    Summarize the following Syntegration conversation for this statement of Importance: ${convo.si}

    Return only the summary without any extra introduction or closing. Use all the available tokens.

    ${convo.seg1}

    ${convo.critique}

    ${convo.seg2}
  `, 1500);
}

function convoHistory(charIndex, convos, config) {
  const {topicParticipants} = config;
  const myTopics = [];
  for(let i = 0; i < topicParticipants.length; i++) {
    if(topicParticipants[i].participants.includes(charIndex)
        || topicParticipants[i].critics.includes(charIndex)) {
      myTopics.push(i);
    }
  }
  const myConvos = [];
  for(let convo of convos) {
    if(myTopics.includes(convo.index)) {
      myConvos.push(convo);
    }
  }

  if(SKIP_SUMMARY) return myConvos.map(convo => `
    ## Begin Previous Conversation Transcript ${convo.iteration}/${convo.index}

    Statement of Importance: ${convo.si}

    ${convo.seg1}

    ${convo.critique}

    ${convo.seg2}

    ## End Previous Conversation Transcript ${convo.iteration}/${convo.index}
  `).join('\n');

  return myConvos.map(convo => `
    ## Begin Previous Conversation Summary ${convo.iteration}/${convo.index}

    Statement of Importance: ${convo.si}

    ${convo.summary}

    ## End Previous Conversation Summary ${convo.iteration}/${convo.index}
  `).join('\n');
}

async function convoSeg1(sessionIndex, polarity, convos, config) {
  const {sisForSign, top12, schedule, topicParticipants, characterBios, triggerQuestion} = config;
  const charCtx = {};
  const curSI = sisForSign[top12[schedule[sessionIndex][polarity]].key];
  const curConvo = topicParticipants[schedule[sessionIndex][polarity]];
  const partBios = curConvo.participants.map(x=>[x, characterBios[x]]);
  const critBios = curConvo.critics.map(x=>[x, characterBios[x]]);
  const charDesires = {};
  const partIndex = rand(curConvo.participants.length);
  let curPart = curConvo.participants[partIndex];
  let convoLen = 0;
  while(convoLen < 25) {
    const curCtx = charCtx[curPart];
    const prompt = `
      ${characterBios[curPart]}
      You are participant #${curPart}.

      You are participating in a syntegration conversation about the following trigger question:
      ${triggerQuestion}

      ${convoHistory(curPart, convos, config)}

      Your statement of importance to discuss is:
      ${curSI}

      ${curCtx ? `
        The conversation has gone as follows:
        ${curCtx}
      `: 'You are starting the conversation.'}

      Limit your response to 3 sentences. Don't always conform to groupthink. Be critical of others' responses. ${desireRating}
    `;
    const rawOut = await aiRequest(prompt, 250);
    const [response, responseDesire] = extractNumberFromEnd(rawOut);
    charDesires[curPart] = responseDesire;
    for(let convoChar of [...curConvo.participants, ...curConvo.critics]) {
      charCtx[convoChar] = (charCtx[convoChar] || '') + `
        #${curPart}: ${response}
      `;
    }
    convoLen++;
    if(Object.keys(charDesires).length < 5) {
      const already = Object.keys(charDesires).map(x=>Number(x));
      const choices = curConvo.participants.filter(x => !already.includes(x));
      curPart = choices[rand(choices.length)];
    } else {
      const topCount = 3;
      const top = Object.entries(charDesires)
        .sort((a, b) => b[1] - a[1]) // Sort by value descending
        .slice(0, topCount);
      const next = rand(topCount);
      curPart = top[next][0];
      for(let key of Object.keys(charDesires)) {
        charDesires[key]++;
      }
    }

  }
  return charCtx[curConvo.participants[0]];
}
async function convoCritique(sessionIndex, polarity, seg1Transcript, convos, config) {
  const {sisForSign, top12, schedule, topicParticipants, characterBios, triggerQuestion} = config;
  const curSI = sisForSign[top12[schedule[sessionIndex][polarity]].key];
  const curConvo = topicParticipants[schedule[sessionIndex][polarity]];
  const charCtx = {};
  const partBios = curConvo.participants.map(x=>[x, characterBios[x]]);
  const critBios = curConvo.critics.map(x=>[x, characterBios[x]]);
  const already = [];
  const partIndex = rand(curConvo.participants.length);
  let curPart = curConvo.critics[partIndex];
  let convoLen = 0;
  while(convoLen < 5) {
    const curCtx = charCtx[curPart];
    const prompt = `
      ${characterBios[curPart]}
      You are critic #${curPart}.

      You are critiquing in a syntegration conversation about the following trigger question:
      ${triggerQuestion}

      ${convoHistory(curPart, convos, config)}

      Your statement of importance to discuss is:
      ${curSI}

      The conversation has gone as follows:
      ${seg1Transcript}

      ${curCtx ? `
        The critique has gone as follows:
        ${curCtx}

        Don't repeat these same points of critique in your response.
      `: 'You are starting the critique.'}

      Limit your critique to 3 sentences. Play devil's advocate. Look for biases, strawman arguments, etc. Respond with only your critique (no introduction of yourself) at this point in the conversation.

    `;
    const rawOut = await aiRequest(prompt, 250);
    const response = rawOut.trim();
    for(let convoChar of [...curConvo.participants, ...curConvo.critics]) {
      charCtx[convoChar] = (charCtx[convoChar] || '') + `
        #${curPart}: ${response}
      `;
    }
    convoLen++;
    already.push(curPart);
    const choices = curConvo.critics.filter(x => !already.includes(x));
    curPart = choices[rand(choices.length)];

  }
  return charCtx[curConvo.critics[0]];
}
async function convoSeg2(sessionIndex, polarity, seg1Transcript, critiqueTranscript, convos, config) {
  const {sisForSign, top12, schedule, topicParticipants, characterBios, triggerQuestion} = config;
  const charCtx = {};
  const curSI = sisForSign[top12[schedule[sessionIndex][polarity]].key];
  const curConvo = topicParticipants[schedule[sessionIndex][polarity]];
  const partBios = curConvo.participants.map(x=>[x, characterBios[x]]);
  const critBios = curConvo.critics.map(x=>[x, characterBios[x]]);
  const charDesires = {};
  const partIndex = rand(curConvo.participants.length);
  let curPart = curConvo.participants[partIndex];
  let convoLen = 0;
  while(convoLen < 15) {
    const curCtx = charCtx[curPart];
    const prompt = `
      ${characterBios[curPart]}
      You are participant #${curPart}.

      You are participating in a syntegration conversation about the following trigger question:
      ${triggerQuestion}

      ${convoHistory(curPart, convos, config)}

      Your statement of importance to discuss is:
      ${curSI}

      The first segment of the conversation went as follows:
      ${seg1Transcript}

      The critique of the first segment is:
      ${critiqueTranscript}

      ${curCtx ? `
        The second segment of the conversation has gone as follows:
        ${curCtx}
      `: 'You are starting the second segment of the conversation.'}

      ${convoLen > 10 ? `
        The conversation is nearing its end. Your response should reflect everyone's shared disagreements and agreements. Limit your response to 3 sentences. ${desireRating}
      ` : `
        Limit your response to 3 sentences. Don't always conform to groupthink. Be critical of others' responses. ${desireRating}
      `}

    `;
    const rawOut = await aiRequest(prompt, 250);
    const [response, responseDesire] = extractNumberFromEnd(rawOut);
    charDesires[curPart] = responseDesire;
    for(let convoChar of [...curConvo.participants, ...curConvo.critics]) {
      charCtx[convoChar] = (charCtx[convoChar] || '') + `
        #${curPart}: ${response}
      `;
    }
    convoLen++;
    if(Object.keys(charDesires).length < 5) {
      const already = Object.keys(charDesires).map(x=>Number(x));
      const choices = curConvo.participants.filter(x => !already.includes(x));
      curPart = choices[rand(choices.length)];
    } else {
      const topCount = 3;
      const top = Object.entries(charDesires)
        .sort((a, b) => b[1] - a[1]) // Sort by value descending
        .slice(0, topCount);
      const next = rand(topCount);
      curPart = top[next][0];
      for(let key of Object.keys(charDesires)) {
        charDesires[key]++;
      }
    }

  }
  return charCtx[curConvo.participants[0]];
}

async function scoreSIs(sisForSign, characterBios, top12) {
  const outScores = [];
  for(let characterBio of characterBios) {
    const prompt = `
      ${characterBio}
      For each of these syntegration "statements of importance" give a score of 1 to 10.
      Scores should cover the wide range of possibilities. You should have some that are below 5.
      Scores should reflect who you are as a person and your areas of expertise.
      Return only the list of scores as numbers in a comma-separated list. The output should only contain the digits and commas.

      ${top12.map(item => sisForSign[item.key]).join('\n')}
    `;
    const rawScores = await aiRequest(prompt, 100);
    const scores = rawScores.split(',').map(x=>Number(x.trim()));
    outScores.push(scores);
  }
  return outScores;
}

async function dupeSIs(flatSis) {
  const prompt = `
    Of these syntegration "statements of importance," (SI) return only a comma-separated list of the numbers of the SIs that are similar and could be combined. Your output should only include the numbers, commas and newlines. Each line should be a set of SIs to combine.
    ${flatSis.map((si, index) => `${index + 1}. ${si}`).join('\n')}

  `;
  const rawSigns = await aiRequest(prompt, 2500);
  return rawSigns.split('\n').map(x=>x.split(',').map(y=>Number(y.trim())-1));
}

async function combineSIs(flatSis, similars) {
  const outSis = [];

  for(let similar of similars) {
    const prompt = `
      Combine these similar syntegration "statements of importance" into a single SI:

      ${similar.map(index => flatSis[index]).join('\n')}

      Relevance: Each SI must relate directly to the overall Opening Question guiding the Syntegration. Keep the main focus in mind.
      Conciseness: Aim for short, impactful statements, ideally a single sentence (the protocol suggests max 10 words). Avoid complex clauses or multiple ideas in one SI. Clarity is key.
      Provocative, Not Conclusive: Good SIs often raise questions, highlight tensions, or propose a perspective that isn't universally accepted yet. They should invite discussion, not close it down. Avoid "motherhood" statements.

      Return only the single SI in the output.
    `;

    const rawCombined = await aiRequest(prompt, 500);
    outSis.push(rawCombined.trim());
  }
  return outSis;
}

async function signSIs(sisForSign, characterBios, triggerQuestion) {
  const outSigns = [];
  for(let characterBio of characterBios) {
    const prompt = `
      ${characterBio}
      Of these syntegration "statements of importance," (SI) choose which ones you believe are worthy of discussion for this trigger question:
      ${triggerQuestion}

      ${sisForSign.map((si, index) => `${index + 1}. ${si}`).join('\n')}

      Select a maximum of 15 of the very best SIs. If there are less than 15 that aren't amazing return fewer selections. You must be very excited about these SIs.
      Return only a comma-separated list of the numbers of each SI that you have selected. There should be no other text in the output except the numbers and the commas. Do not include any introductory text about your character in the response.
    `;
    const rawSigns = await aiRequest(prompt, 500);
    const signs = rawSigns.split(',').map(x => Number(x.trim()) - 1);
    if(signs.includes(NaN)) {
      console.log(prompt, rawSigns);
      break;
    }
    outSigns.push(signs);
  }
  return outSigns;
}

async function generateSIs(characterBios, triggerQuestion) {
  const allSis = [];
  for(let characterBio of characterBios) {
    const rawSI = await aiRequest(`
      ${characterBio}
      Generate 3 syntegration "statements of importance" related to this trigger question:
      ${triggerQuestion}
      Return only the statements themselves. Each one should be on its own line. There should be no extra output. Do not number the statements.

      Relevance: Each SI must relate directly to the overall Opening Question guiding the Syntegration. Keep the main focus in mind.
      Conciseness: Aim for short, impactful statements, ideally a single sentence (the protocol suggests max 10 words). Avoid complex clauses or multiple ideas in one SI. Clarity is key.
      Provocative, Not Conclusive: Good SIs often raise questions, highlight tensions, or propose a perspective that isn't universally accepted yet. They should invite discussion, not close it down. Avoid "motherhood" statements.
    `, 500);
    const SIs = rawSI.split('\n').map(x => x.trim()).filter(x => x !== '');
    allSis.push(SIs);
  }

  return allSis;
}
