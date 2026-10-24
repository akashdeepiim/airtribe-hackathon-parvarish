export const stages = [
  {
    id: 'planning',
    label: 'Dreaming',
    age: 'Planning a family',
    short: 'A little possibility.',
    title: 'A new chapter, before the first page.',
    copy: 'Make room for the hopes, conversations and people you want beside you. There is no single way to begin a family.',
    prompt: 'What would you love your future family to feel like?',
    color: '#E9DFF1',
    paper: '#F4EEF8',
    story: 'before-we-meet',
  },
  {
    id: 'expecting',
    label: 'Expecting',
    age: 'A little one on the way',
    short: 'So much to imagine.',
    title: 'You haven’t met. You’re already a family.',
    copy: 'A place to pause, imagine your everyday together and think about the people you can lean on.',
    prompt: 'What is one little thing you cannot wait to share?',
    color: '#F3C7B0',
    paper: '#FFF0E5',
    story: 'before-we-meet',
  },
  {
    id: 'baby',
    label: 'Little beginnings',
    age: 'Birth–1 year',
    short: 'Hello, little world.',
    title: 'A whole new world. For both of you.',
    copy: 'The tiny socks. The familiar lullaby. The ordinary moments that become your family’s favourite stories.',
    prompt: 'What would you like to remember about today?',
    color: '#F2D87B',
    paper: '#FFF8DE',
    story: 'the-ordinary-days',
  },
  {
    id: 'toddler',
    label: 'Big little world',
    age: '1–3 years',
    short: 'A little more wonder.',
    title: 'Their world is growing. So is yours.',
    copy: 'A favourite book, a funny little ritual, a new corner of the park. Make room for their story, and your own.',
    prompt: 'What is the wonderfully ordinary thing they love right now?',
    color: '#C6D8C1',
    paper: '#EDF2E7',
    story: 'the-ordinary-days',
  },
  {
    id: 'preschool',
    label: 'Wonderful whys',
    age: '3–5 years',
    short: 'Oh, the possibilities.',
    title: 'A bigger imagination. More stories to tell.',
    copy: 'Keep a little space for the things they say, the worlds they invent and the people they are becoming.',
    prompt: 'What is a story only your family could tell?',
    color: '#C7D5E9',
    paper: '#ECF1FA',
    story: 'your-little-village',
  },
] as const;
export type Stage = (typeof stages)[number];
export type StageId = Stage['id'];

export const stories = [
  {
    slug: 'the-ordinary-days',
    title: 'One day, you’ll miss the ordinary.',
    category: 'The little things',
    reading: '2 minute pause',
    art: 'toddler' as StageId,
    intro: 'Not every memory comes with a candle, a celebration or a date circled on the calendar.',
    paragraphs: [
      'Sometimes it is a pair of tiny shoes by the door. The book with the bent corner. The song that somehow belongs to every car ride.',
      'Family life leaves its stories everywhere. In the names we give things. In the particular way someone says goodnight. In a photograph that would mean very little to anyone else, and everything to you.',
      'You do not have to document the whole day to keep a piece of it. A sentence can hold a season. “You asked for this story again.” “We took the long way home.” “This was our favourite corner of the house.”',
      'There is room for the beautiful moments, and the unfinished ones. The blurry photograph can stay blurry. The caption can be a few words. This is a family story, not a performance.',
      'If you feel like it, make a little note today: what is ordinary in your home right now? One day, it may be exactly what you want to remember.',
    ],
    prompt: 'Today, our ordinary looked like…',
  },
  {
    slug: 'before-we-meet',
    title: 'A little letter, before we meet.',
    category: 'Before the beginning',
    reading: '2 minute pause',
    art: 'expecting' as StageId,
    intro: 'Some family stories begin long before there is a photograph to put in the album.',
    paragraphs: [
      'They begin in a conversation. A possibility. A name you try saying out loud. Or a feeling that takes a while to find its words.',
      'There is no perfect starting line for a family, and no need to make your story look like someone else’s. You can be excited and uncertain. You can have a plan, or still be finding one.',
      'A letter can be a quiet place for those feelings. It does not need to predict the future. It can simply say what your world looks like today, who is in it and what you hope to share.',
      'Perhaps it is a family recipe, a street you love walking down, or the friend who already feels like family. Perhaps it is a promise to keep learning together.',
      'You can keep that letter on paper, leave it unfinished, or come back to it another day. The point is not to have all the answers. It is to leave a little room for your own voice.',
    ],
    prompt: 'One thing I hope we get to share is…',
  },
  {
    slug: 'your-little-village',
    title: 'A village can be a very small circle.',
    category: 'Growing together',
    reading: '2 minute pause',
    art: 'planning' as StageId,
    intro:
      'Your people are not always the people who live closest. They are the ones you want beside you.',
    paragraphs: [
      'There is the person who remembers to ask about you. The grandparent who makes up stories. The friend who arrives with food and stays for the washing-up.',
      'Every family has its own shape. Some circles are large and lively. Others are small and quiet. There is no number you need to reach.',
      'Being part of a child’s world can mean many things: a regular phone call, a favourite shared book, an afternoon together. It can also mean listening to what the parent actually wants.',
      'Sharing your family’s story is your choice. You can invite someone into a memory without opening every part of your life. You can change your mind. Closeness and boundaries can belong in the same sentence.',
      'Take a moment to think about your people. Who makes room for your family to be itself? Sometimes naming your little village is the beginning of feeling it.',
    ],
    prompt: 'The people who make our world a little warmer are…',
  },
] as const;

export const questions = [
  {
    q: 'Can I explore before becoming a parent?',
    a: 'Yes. The dreaming and expecting journeys are public. Explore the reflections without an account. Your stage selection stays on this page; we do not save pregnancy or planning information.',
  },
  {
    q: 'What can I use in this early version?',
    a: 'You can sign in with an email code, create a private child profile from birth to age five, choose your consent settings and invite family with specific access. Memory timelines, milestone guidance and activity suggestions are coming in later releases.',
  },
  {
    q: 'Who can see my child’s information?',
    a: 'Only the people with access to your family space. You choose their permissions. Photos are private, and health information has separate access controls. Each person also makes their own consent choices.',
  },
  {
    q: 'Is this medical advice?',
    a: 'No. These public stories are reflections on family life. They do not assess development or provide pregnancy, fertility or medical guidance. Clinical content will only appear after review and approval.',
  },
  {
    q: 'Is Parvarish only for parents in Bangalore?',
    a: 'We are starting with families in Bangalore, in English. You can explore the public journeys from anywhere. Broader local community features will come as the product grows.',
  },
] as const;
