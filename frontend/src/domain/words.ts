// Common English words, roughly most frequent first. Lowercase letters only; drills
// filter this list to the letters a learner already knows, so the home-row block
// below keeps the first lessons in real words.
const SOURCE = `
the be to of and a in that have it for not on with he as you do at this but his by from
they we say her she or an will my one all would there their what so up out if about who
get which go me when make can like time no just him know take people into year your good
some could them see other than then now look only come its over think also back after use
two how our work first well way even new want because any these give day most us is was are
been has had were said did made find long down man here thing many where great still between
need home own world life same last right old line every sentence under never place while
part through again point world head stand house both end high hand turn large small begin
help show run few seem tell let ask late hard open read real run near light kind far live
might next state answer water side stop school night story start city earth eye change
idea early learn plant cover food sun four thought land often until mile river car feet care
second group carry took rain eat room friend began grow study door order red often between
air area art east enter entire era error ear earn eaten inner insert inside instant into
iron nation near neat nest net nine noise none nor nose note notes oar oat onto ore rain
raise rare rat rate ratio rent rest retain riot rise risen roast rose rot rotten sat saint
sane sea seat senior sent series session set sister sit site snore son soon sort star
start state station stain stairs stone store street stress tan tar tea tear ten tennis tent
terror test tie tin tire toast toe ton tone too toss tree trees train treat trio tension
assert assist attest stir sister tease tenor tonnes orient onion stern sort treaties
resist retire ration senate sienna stereo toaster resort reason season tissue nineteen
interest interior attention tattoo sonata ornate restore retina snort tortoise insist
resin rosier sitar tarot sneer sooner tornado iota aorta arson
game gate gem germ giant girl grant grass great green greet grim grin groan gross gain
gamer magnet manage mean meat meet men mine miss mist moment more most motor name same
seem smart some stem storm team term time item image imagine among stamina migrate mission
monster nominate ongoing origin sign sing singer string strong sting sitting setting rising
eating resting testing morning mention mirror moose matter master mister minister
merit metro mirage magma omega engine enigma emerge orange organ magenta mango ignore
ago age anger agent angst again against garment segment moments monitor
had has he her here hide head heat hear heart hand hard hint hot horse hidden hate
dish disk done door dream dress drain drama drone dead deal dear dent desire dine dinner
diet dirt draw end send sand side ride read rode road need seed shade shadow shine shoe
shore short shot shirt three third throne thread these those this that than then then
hand handed harsh hatred honest honor harden hearth hinted indeed inherit
code coat coin cone cart case cast cat center certain choice chance chain change charge
chair cheer chest chin coast cotton crash crate cream create credit crest crisis critic
dock deck dark desk kind kick kit kite knee knot know kettle skate skin skirt stick
stock stack sock rock rack neck check snack trick track think thank shark smoke
cake cook cool cork crack crisp
look lake land lane last late lead lean less let line lion list little load loan local
long lose lost loud love lunch luck lute unit until under unless upon used usual
blue clue glue rule true value tune tube cute mute flute salute absolute
full fall fill fell feel file film final fine fire first fish five flag flat flight
float floor flow fold follow food foot force forest form fort found frame free fresh
front fruit fuel fund funny pack page paid pain paint pair palm pan paper park part
party pass past path pause peace peak pen people pepper perfect person phone piano pick
piece pilot pin pipe pitch place plain plan plane plant plate play plot plus pocket poem
point pole pool poor pop port post pound power press pretty price pride print prize
proof proper proud public pull pump pure purple push put
wait wake walk wall want warm wash watch water wave wear weather week weight west wet
what wheel when where white whole wide wife wild win wind window wine wing winter wire
wise wish wolf woman wonder wood word work world worry worth write wrong yard yeah year
yellow yes yet young your youth yesterday daily early happy heavy lady many only party
ready reply story study today very away always anyway everyday
back bad bag ball band bank bar base basic bath bay beach bean bear beat bed beer bell
belt bench best bike bill bird birth bit bite black blade blank blind block blood board
boat body bone book boot born boss both bottle bottom bowl box brain brave bread break
brick bridge brief bright bring broad brown brush build burn bus busy butter buy
vast verb verse view visit voice vote vivid valley van vary vest video village violin
above advice avoid brave cave dive drive even ever every evil five give gave have
level live love move never over river save seven silver solve stove travel wave
jam jar jet job join joke joy judge juice jump jungle just
queen quest quick quiet quite quote quality quarter question require square equal
box fix fox mix six tax wax next text extra exact exam expert explain express
zero zone zoo size prize lazy crazy frozen dozen amaze breeze freeze
add ads adds alas asks dad dads fad fads falls flask flasks lad lads lass sad salad salads alfalfa
glad gas had has hall halls half lag lags flag flags gal ash dash gash lash flash glass sag saga
shall slash hash
`;

export const WORDS: readonly string[] = Array.from(new Set(SOURCE.split(/\s+/u).filter(word => /^[a-z]+$/u.test(word))));
