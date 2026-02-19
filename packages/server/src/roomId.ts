import { randomInt } from 'node:crypto';

const ADJECTIVES = [
  'able','aged','airy','back','bald','bare','big','blue','bold','bone',
  'born','boss','both','calm','chic','cold','cool','cozy','cute','damp',
  'dark','dead','deaf','dear','deep','dial','dim','dire','done','down',
  'drab','dry','dual','dull','dusk','each','east','easy','edgy','epic',
  'even','evil','fair','fake','far','fast','fine','firm','fish','five',
  'flat','fond','fool','four','free','full','fury','glad','glib','gold',
  'gone','good','gray','grim','half','hard','hazy','held','high','holy',
  'home','huge','hung','hurt','iced','idle','iron','jade','keen','kind',
  'lame','last','late','lazy','lean','left','like','live','lone','long',
  'lost','loud','lush','made','main','many','mean','mega','mild','mint',
  'mock','more','most','much','mute','near','neat','next','nice','nine',
  'noir','numb','oily','okay','once','only','open','over','paid','pale',
  'past','pink','plan','plum','plus','poor','pure','quad','rare','raw',
  'real','rich','ripe','rose','ruby','rude','safe','sage','salt','same',
  'sane','side','silk','slim','slow','smug','snap','snob','snug','soft',
  'sole','some','sore','sour','star','such','sure','tall','tame','tart',
  'taut','teal','thin','tidy','tiny','torn','true','twin','ugly','upon',
  'used','vain','vast','very','void','warm','wary','wavy','weak','west',
  'wide','wild','wily','wine','wise','worn','zero','zinc','avid','arty',
  'awry','balm','best','bone','busy','calm','cape','core','cozy','deft',
];

const NOUNS = [
  'aces','arch','army','atom','axle','bale','band','bank','barn','base',
  'bath','bear','bell','belt','bend','bike','bird','blot','blur','boat',
  'bolt','bomb','bond','bone','book','boss','bowl','bulb','bull','burn',
  'bush','cage','cake','calm','camp','cape','card','cart','cave','chef',
  'chip','clam','clay','clip','club','coal','coat','code','coil','coin',
  'colt','cone','cook','cope','cord','core','cork','crab','crew','crow',
  'cube','curl','dash','dawn','deer','desk','dice','dime','disc','dock',
  'dome','door','dose','dove','drum','duck','duel','duke','dune','dusk',
  'dust','earl','edge','elms','epic','face','fade','fame','fang','farm',
  'fawn','fern','file','film','fire','fish','flag','flaw','flip','flock',
  'foam','fold','font','fool','fork','fort','fowl','frog','fuel','fuse',
  'gale','game','gate','gear','gift','glow','glue','goat','gold','golf',
  'gown','gram','grid','grin','grip','gust','hail','halo','hare','harp',
  'hawk','haze','heat','helm','herb','hero','hide','hill','hive','holt',
  'hood','hook','hope','horn','host','howl','hull','hymn','iris','isle',
  'jade','jazz','jest','joke','jury','kale','keel','kelp','king','kite',
  'knob','knot','lace','lake','lamb','lamp','lane','lark','lava','lawn',
  'leaf','lime','link','lion','lock','loft','loom','lord','lure','lynx',
  'mace','malt','mane','mask','mate','maze','mesa','mice','mill','mine',
  'mint','mist','moat','mold','moon','moss','mule','myth','nail','nest',
  'node','note','nova','oath','opal','orca','oryx','oven','pace','pack',
  'page','pail','palm','pane','park','path','pawn','peak','pear','pier',
  'pike','pine','plum','poem','pole','pond','port','post','prey','prow',
  'puma','pump','quay','raft','rail','rain','rake','ramp','reef','rein',
  'ring','road','robe','rock','root','rope','ruby','rush','sage','sail',
  'salt','sand','seal','seed','shed','silk','silo','sink','slab','slug',
  'snow','sofa','soil','sole','song','soul','spar','star','stem','stew',
  'stir','surf','swan','tale','tank','tarn','tide','tile','toad','tomb',
  'tone','tool','tray','tree','trim','tuba','tube','tuna','turf','twig',
  'vale','vane','veil','vest','vine','void','volt','wade','wail','wall',
  'wand','ward','wasp','wave','weed','well','whip','wick','wild','wilt',
  'wind','wing','wire','wolf','wood','wool','worm','wren','yarn','yawl',
  'yoke','zinc','zone',
];

/** Generate a 3-word room ID like "cool-bold-tiger". Checks against existing IDs to avoid collision. */
export function generateRoomId(existingIds: Set<string>): string {
  for (let attempt = 0; attempt < 100; attempt++) {
    const a1 = ADJECTIVES[randomInt(ADJECTIVES.length)];
    const a2 = ADJECTIVES[randomInt(ADJECTIVES.length)];
    const noun = NOUNS[randomInt(NOUNS.length)];
    const id = `${a1}-${a2}-${noun}`;
    if (!existingIds.has(id)) return id;
  }
  // Fallback: append random digits
  const a1 = ADJECTIVES[randomInt(ADJECTIVES.length)];
  const a2 = ADJECTIVES[randomInt(ADJECTIVES.length)];
  const noun = NOUNS[randomInt(NOUNS.length)];
  return `${a1}-${a2}-${noun}-${randomInt(1000)}`;
}
