# The AI Synthegration

* Synthetic (AI participants instead of humans)
* Synergy
* Tensegrity (tensile strength)

Node.js scripts for running a full syntegration from:

* Trigger question: e.g. How to best create a d/acc pop-up city that could exist permanently?
* 30 Character Bios

The flow goes through all the steps adapted from Stafford Beer's book, Beyond Dispute:

1. Each character generates 3 draft statements of importance
2. Duplicate SIs are combined
3. Each character signals which SIs they find worthy of discussion
4. Each character votes on how interested they are in the top 12 SIs from the previous step
5. Characters are assigned to SI conversations as participant or critique based on their interest level votes using a hill-climbing algorithm with quadratic penalties
6. All 12 conversations are run through 3 iterations for a total of 36 conversations

Each conversation consists of:

1. First segment: 25 responses from the 5 participants
2. Critique: 5 responses from the 5 critics
3. Second segment: 15 responses from the 5 participants to wrap up the conversation

Since AI characters must be prompted for a response, the conversation begins by selecting a random participant.

Each response also includes a desire score from 0-9 corresponding to how much they want to reply again.

Then the next response is generated from a random character from the top 3 desire scores.

The other characters that do not speak have their desire scores increased by 1 after each response, ensuring that all characters have a chance to talk.

## Installation

```
$ git clone git@github.com:numtel/syntegration-ai.git
$ cd syntegration-ai
$ npm install
$ vim .env
# GEMINI_API_KEY, GROQ_API_KEY, OPENAI_API_KEY vars
# Choose your model in the ai.js file
```

Configure the character bios in `bios.3.js` and your trigger question in `index.js` then run `npm start` to begin a syntegration!

The process performs many, many AI requests and can take longer than 30 minutes to run completely.


