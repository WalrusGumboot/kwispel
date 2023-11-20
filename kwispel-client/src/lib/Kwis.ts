export type Vraag = {
    soort: "tekst" | "foto" | "geluid",
    tekst: string
}

export type Kwis = {
    vragen: Vraag[],
    huidigeVraagIdx: number,
    fase: "nogNietBegonnen" |
    "antwoordenVerzamelen" |
    "antwoordenPresenteren" |
    "stemmen" |
    "stemresulatenPresenteren" |
    "beëindigd"
}

export const PUNTEN_PER_STEM = 100;

export const standaardKwis: Kwis = {
    vragen: [
        { soort: "tekst", tekst: "De salamanders van Vaes be like: 'Senior, commilitones, laat ons drinken op {}!'" },
        { soort: "tekst", tekst: "Uw moeder is zo {} dat ze {}." }
    ],
    huidigeVraagIdx: 0,
    fase: "nogNietBegonnen"
}