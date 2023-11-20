type TekstAntwoordData = string[];
type AnderAntwoordData = string;

type AntwoordData = TekstAntwoordData | AnderAntwoordData;

export type Antwoord = {
    getoond: boolean,
    spelerId: string,
    stemmen: number,

    data: AntwoordData
}