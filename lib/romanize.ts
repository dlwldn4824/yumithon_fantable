// Revised Romanization of Korean (simplified: linking across ㅇ, no other sound changes).
// Used to show venue names to fans who can't read Hangul; the Hangul stays alongside for taxis/maps.
const I = ["g", "kk", "n", "d", "tt", "r", "m", "b", "pp", "s", "ss", "", "j", "jj", "ch", "k", "t", "p", "h"];
const V = ["a", "ae", "ya", "yae", "eo", "e", "yeo", "ye", "o", "wa", "wae", "oe", "yo", "u", "wo", "we", "wi", "yu", "eu", "ui", "i"];
const F = ["", "k", "k", "k", "n", "n", "n", "t", "l", "k", "m", "l", "l", "l", "p", "l", "m", "p", "p", "t", "t", "ng", "t", "t", "k", "t", "p", "t"];
// When a final consonant is followed by ㅇ, it moves to the next syllable as an initial.
const LINK: Record<number, string> = { 1: "g", 2: "kk", 4: "n", 7: "d", 8: "r", 16: "m", 17: "b", 19: "s", 20: "ss", 22: "j", 23: "ch", 24: "k", 25: "t", 26: "p" };

function syllables(word: string) {
  return [...word].map((ch) => {
    const c = ch.charCodeAt(0) - 0xac00;
    if (c < 0 || c > 11171) return null;
    return { i: Math.floor(c / 588), v: Math.floor((c % 588) / 28), f: c % 28 };
  });
}

function romanizeWord(word: string) {
  const syl = syllables(word);
  let out = "";
  syl.forEach((s, k) => {
    if (!s) { out += [...word][k]; return; }
    const next = syl[k + 1];
    const linked = next && next.i === 11 && LINK[s.f] !== undefined;
    const prev = syl[k - 1];
    const init = prev && prev.i !== undefined && prev.f && s.i === 11 && LINK[prev.f] !== undefined ? LINK[prev.f] : I[s.i];
    out += init + V[s.v] + (linked ? "" : F[s.f]);
  });
  return out;
}

export function romanize(text: string) {
  return text
    .split(/(\s+)/)
    .map((w) => (/[가-힣]/.test(w) ? romanizeWord(w).replace(/^./, (c) => c.toUpperCase()) : w))
    .join("");
}

export const hasHangul = (s?: string | null) => !!s && /[가-힣]/.test(s);
