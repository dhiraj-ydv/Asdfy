// Lesson content is data, separate from application and persistence logic.
// Identifiers start at 101: version 1 databases keep lessons 1–28 so old results keep their titles.
use crate::models::Lesson;

const fn lesson(
    id: i64,
    stage: &'static str,
    title: &'static str,
    kind: &'static str,
    keys: &'static str,
    content: &'static str,
) -> Lesson {
    Lesson { id, stage, title, kind, keys, content }
}

const HOME: &str = "Home row";
const INDEX: &str = "Index reach";
const TOP: &str = "Top row";
const ALPHABET: &str = "Full alphabet";
const SYMBOLS: &str = "Shift, symbols and numbers";
const TEXT: &str = "Real text";

pub const LESSONS: &[Lesson] = &[
    lesson(101, HOME, "Home row anchors", "keys", "arstneio", ""),
    lesson(102, HOME, "Inner reach: G and M", "keys", "gm", ""),
    lesson(103, HOME, "Home row words", "words", "", ""),
    lesson(104, INDEX, "Bottom index: D and H", "keys", "dh", ""),
    lesson(105, INDEX, "C and K", "keys", "ck", ""),
    lesson(106, INDEX, "Review: home and bottom", "words", "", ""),
    lesson(107, TOP, "L and U", "keys", "lu", ""),
    lesson(108, TOP, "F and P", "keys", "fp", ""),
    lesson(109, TOP, "W and Y", "keys", "wy", ""),
    lesson(110, TOP, "Review: top row", "words", "", ""),
    lesson(111, ALPHABET, "B and V", "keys", "bv", ""),
    lesson(112, ALPHABET, "Rare letters: J, Q, X and Z", "keys", "jqxz", ""),
    lesson(113, ALPHABET, "Review: every letter", "words", "", ""),
    lesson(114, SYMBOLS, "Capital letters", "caps", "", ""),
    lesson(115, SYMBOLS, "Punctuation", "punctuation", "", ""),
    lesson(116, SYMBOLS, "Numbers", "numbers", "", ""),
    lesson(117, TEXT, "Prose: First light", "text", "",
        "The first light crept over the hills and found the village still asleep. A kettle hissed in a quiet kitchen, a dog stretched by the door, and somewhere a radio began to hum an old song. By the time the baker opened the shutters, the street smelled of bread and rain."),
    lesson(118, TEXT, "Prose: Rhythm", "text", "",
        "Good typing is less about speed than rhythm. Keep your wrists relaxed, let each finger return home, and trust the layout. Speed arrives on its own once the motions stop needing thought, so practice a little every day rather than a lot once a week."),
    lesson(119, TEXT, "Prose: Gettysburg", "text", "",
        "Four score and seven years ago our fathers brought forth on this continent, a new nation, conceived in Liberty, and dedicated to the proposition that all men are created equal."),
    lesson(120, TEXT, "Code: Python", "text", "",
        "def mean(values: list[float]) -> float: return sum(values) / len(values) if values else 0.0"),
    lesson(121, TEXT, "Code: Rust", "text", "",
        "for (index, word) in words.iter().enumerate() { println!(\"{index}: {word}\"); }"),
    lesson(122, TEXT, "Code: Shell", "text", "",
        "grep -rn \"TODO\" src/ | sort -u > todo.txt && wc -l todo.txt"),
];

pub fn contains(id: i64) -> bool {
    LESSONS.iter().any(|lesson| lesson.id == id)
}
