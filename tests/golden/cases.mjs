// Inputs of the golden test: pairs of texts compared under several option
// sets. The expected scores live in results.json. Add cases freely; when a
// change moves a score on purpose, run `npm run golden:update` and say why in
// the pull request.

export const OPTIONS = {
  default: undefined,
  music: { preset: 'music' },
  'music+phonetic': { preset: 'music', phonetic: true },
  search: { preset: 'search' },
  strict: { preset: 'strict' },
  'no-numbers': { numbers: false },
  stopwords: { stopwords: true, strip: ['articles'] },
};

export const PAIRS = [
  // Typos, accents, case
  ['Bohemian Rhapsody', 'bohemian rapsody'],
  ['Bohemian Rhapsody', 'bohemain rhapsody'],
  ['Saint-Étienne', 'saint etienne'],
  ['Molière', 'MOLIERE'],
  ['Beyoncé', 'beyonce'],
  ['Strasbourg', 'strasbrug'],
  ['necessary', 'neccessary'],
  ['receive', 'recieve'],
  ['the', 'teh'],
  ['Zinédine Zidane', 'zinedine zidanne'],
  // Word order, spaces, punctuation
  ['John Smith', 'Smith, John'],
  ['Stairway to Heaven', 'stairwaytoheaven'],
  ["Don't Stop Me Now", 'dont stop me now'],
  ['Rock & Roll', 'rock and roll'],
  ['AC/DC', 'acdc'],
  ['Guns N’ Roses', 'guns and roses'],
  ['Hello, World!', 'hello world'],
  // Music noise
  ['Hey Jude - Remastered 2015', 'hey jude'],
  ['Lose Yourself (feat. Eminem)', 'lose yourself'],
  ['Shape of You (Acoustic)', 'shape of you'],
  ['The Beatles', 'beatles'],
  ['Les Rita Mitsouko', 'rita mitsouko'],
  ["L'Aventurier", 'aventurier'],
  ['Get Lucky (feat. Pharrell Williams) - Radio Edit', 'get lucky'],
  ['Smells Like Teen Spirit [Live]', 'smells like teen spirit'],
  ['Die Ärzte', 'arzte'],
  ['El Niño', 'nino'],
  // Numbers in words, roman numerals, ordinals
  ['Two Become One', '2 become 1'],
  ['Deux', '2'],
  ['quatre vingt dix sept', '97'],
  ['soixante et onze', '71'],
  ['vingt et une', '21'],
  ['twenty one pilots', '21 pilots'],
  ['Rocky IV', 'rocky 4'],
  ['Chapter II', 'chapter two'],
  ['the first time', '1st time'],
  ['la deuxieme fois', 'la 2e fois'],
  ['la 2eme fois', 'la 2e fois'],
  ['dix sept', '17'],
  ['twp', 'two'],
  // Sounds alike
  ['beyonsay', 'Beyoncé'],
  ['nite', 'night'],
  ['fone', 'phone'],
  ['kwin', 'Queen'],
  ['chakira', 'Shakira'],
  ['ed shiran', 'Ed Sheeran'],
  ['mikael jakson', 'Michael Jackson'],
  // Partial, prefixes, acronyms
  ['stair', 'Stairway to Heaven'],
  ['bohem', 'Bohemian Rhapsody'],
  ['nyc', 'New York City'],
  ['nyx', 'New York City'],
  ['gs', 'git status'],
  ['heaven stair', 'Stairway to Heaven'],
  ['sev', 'Seven Nation Army'],
  // Must not match
  ['Paris', 'Lyon'],
  ['Hey Jude', 'Let It Be'],
  ['Queen', 'King'],
  ['Michael Jackson', 'Janet Jackson'],
  ['one', 'none'],
  ['cat', 'act'],
  ['', 'something'],
  ['', ''],
  // Data cleaning
  ['Jean Dupont SARL', 'jean dupont'],
  ['The Lord of the Rings', 'lord rings'],
  ['ACME Inc.', 'Acme Incorporated'],
  ['123 Main St.', '123 main street'],
  ['Mc Donald', 'McDonald'],
  ['O’Brien', "o'brien"],
  // Longer texts
  ['The quick brown fox jumps over the lazy dog', 'the quikc brown fox jumped over a lazy dog'],
  ['Lorem ipsum dolor sit amet, consectetur adipiscing elit', 'lorem ipsum dolor sit amet consectetur adipiscing'],
];

/** A small list for ranking checks. */
export const LIST = [
  'Bohemian Rhapsody', 'Stairway to Heaven', 'Hey Jude', 'Let It Be', 'Seven Nation Army',
  'Smells Like Teen Spirit', 'Shape of You', 'New York, New York', 'Billie Jean', 'Hotel California',
  'Imagine', 'Yesterday', 'Wonderwall', 'Hallelujah', 'Sweet Child O’ Mine', 'Get Lucky',
];
export const QUERIES = ['bohem', 'stair', 'hey', 'nyny', 'seven', 'hotel cali', 'yestrday', 'wonder wall', 'sweet child', 'xyz'];
