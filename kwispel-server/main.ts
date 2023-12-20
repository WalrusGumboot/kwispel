import { createServer } from "http";
import { Server } from "socket.io";
const server = createServer();

//@ts-ignore
const io = new Server(server, {
    connectionStateRecovery: {},
    cors: {
        origin: "*"
    },
    maxHttpBufferSize: 10_000_000, // 10 MB, zoals ook de nginx reverse proxy werkt,
    // pingInterval: 60000,
    // pingTimeout: 120000
})
server.listen(
    3141,
    () => {
        console.log("[websocket server geactiveerd] (poort 3141)")
    }
)

import type { Gast, Richting } from "../kwispel-client/src/lib/Gast";
import { standaardKwis, type Kwis } from "../kwispel-client/src/lib/Kwis";
import type { Antwoord } from "../kwispel-client/src/lib/Antwoord";

let gasten: Gast[] = [];
let weeskinders: Gast[] = []; // spelers wiens oorspronkelijke socketverbinding weg is gevallen
let kwis: Kwis = standaardKwis;
let antwoorden: Antwoord[] = [];

class GeenSpelerError extends Error { }
class MeerdereGastenError extends Error { }

function ageer<T>(id: string, functie: (gast: Gast) => T): T {
    let matchendeIds = gasten.filter((gast) => gast.id === id);
    if (matchendeIds.length === 1) {
        return functie(matchendeIds[0]);
    } else if (matchendeIds.length === 0) {
        console.error(`Wel nogal kaka, geen enkele speler met id ${id} gevonden, maar no worries.`);
        throw GeenSpelerError
    } else {
        console.error(`[ERROR] meerdere gasten met id ${id} gevonden.`);
        throw MeerdereGastenError;
    }
}

function ageerAdmin<T>(functie: (gast: Gast) => T): T {
    let admin = gasten.find((g) => g.admin)
    if (admin !== undefined) {
        return functie(admin);
    } else {
        throw Error(`[ERROR] geen admin gevonden.`);
    }
}

function stuurNaarAdmin(ev: string, ...args: any[]) {
    ageerAdmin((admin) => { io.to(admin.id).emit(ev, ...args) });
    console.log(`   [naar admin]: ${ev} met args ${args}`)
}

io.on('connection', (socket) => {
    // CONNECTIELOGICA
    console.log(`[nieuwe verbinding] ${socket.id.substring(16)}`);
    if (gasten.length === 0) {
        gasten.push({ id: socket.id, admin: true, naam: "ADMIN", punten: 0, richting: undefined });
        socket.emit("adminKennisgeving");
        console.log(' ↳ [admin  geregistreerd]');
    } 
    // else {
    //     // we gaan kijken of er een herregistratie na het wegvallen van een verbinding nodig is
    //     let mogelijksWeeskind = weeskinders.find((e) => e.id === socket.id)
    //     if (mogelijksWeeskind !== undefined) {
    //         weeskinders = weeskinders.filter((g) => g.id !== socket.id); // weghalen van weeskind
    //         gasten.push(mogelijksWeeskind)
    //         stuurNaarAdmin("idVeranderingKennisgeving", mogelijksWeeskind.id, socket.id) // zorgt ervoor dat de speler bij de admin terug bijkomt
    //     }
    // }
    // else {
    //     if (idAanwezig(socket.id)) {
    //         console.log(' ↳ [speler al gekend, niet opnieuw geregistreerd]');
    //     } else {
    //         gasten.push({ id: socket.id, admin: false, naam: undefined, punten: 0 });
    //         stuurNaarAdmin("nieuweSpelerKennisgeving", socket.id);
    //         console.log(' ↳ [speler geregistreerd]');
    //     }
    // }

    socket.on("forceerKwisStatus", (nieuweStatus) => {
        kwis.fase = nieuweStatus;
        console.log(`[geforceerde kwisstatus] ${nieuweStatus}`)
        socket.emit("kwisUpdate", kwis);
    })

    socket.on("disconnect", (reden) => {
        ageer(socket.id, (gast) => {
            if (reden == "ping timeout" || reden == "transport close") {
                console.log(`[verbinding weggevallen] - ${socket.id.substring(16)} misschien recoverable (reden: ${reden})`)
                console.log(`[                      ] - nu is ${gast.naam} een weeskind`)
                if (gast.admin) {
                    console.log(" ↳ [WARN] het was de adminconnectie")
                } else {
                    gasten = gasten.filter((g) => g.id !== gast.id);
                    weeskinders.push(gast)
                    stuurNaarAdmin("weeskindKennisgeving", gast);
                }
            }
        })
    })

    socket.on("watZullenWeHerverbinden", (callback: (weeskinders: Gast[]) => void) => {
        console.log(`[weeskinderen aanvraag] van socket ${socket.id.substring(16)}`)
        console.log(`[                     ] teruggegeven: ${weeskinders}`)
        callback(weeskinders);
    })

    socket.on("infoburstAanvraag", (geadopteerdKind: Gast, callback: (kwisStatus: Kwis) => void) => {
        weeskinders = weeskinders.filter((g) => g.id !== geadopteerdKind.id);
        stuurNaarAdmin("idVeranderingKennisgeving", geadopteerdKind.id, socket.id)
        console.log(`[adoptie] tegen de admin gezegd dat weeskind met id ${geadopteerdKind.id} nu van id ${socket.id} is`)
        gasten.push({ ...geadopteerdKind, id: socket.id });
        callback(kwis)
        socket.emit("scorebord", gasten.filter((e) => !e.admin))
    })

    // NAAMREGISTRATIE
    socket.on("registreerNaam", (naam: string, richting: Richting, callback: (ret: string) => void) => {
        gasten.push({ admin: false, naam, id: socket.id, punten: 0, richting })
        console.log(`[naam geregistreerd] voor ${socket.id.substring(16)}: "${naam}"`)
        stuurNaarAdmin("naamRegistratieKennisgeving", socket.id, naam);
        callback("naam geregistreerd.")
    })

    // KWIS START
    socket.on("startKwis", () => {
        console.log("[kwis start binnengekregen]")
        kwis.fase = "antwoordenVerzamelen";
        io.emit("kwisUpdate", kwis);
        console.log("[kwisstatus veranderd] kwis gestart");
    })

    socket.on("verstuurAntwoord", (antwoord: Antwoord) => {
        console.log(`[antwoord gekregen]: ${socket.id.substring(16)} gaf ${antwoord}`);
        antwoorden.push(antwoord)
        stuurNaarAdmin("antwoordKennisgeving", antwoord);

        if (antwoorden.length === gasten.length - 1) {
            kwis.fase = "antwoordenPresenteren";
            io.emit("kwisUpdate", kwis);
        }
    })

    socket.on("klaarVoorStemmen", () => {
        console.log("[klaar voor stemming]")
        kwis.fase = "stemmen";
        io.except(gasten.find((g) => g.admin)!.id).emit("declareerAntwoorden", antwoorden);
        io.emit("kwisUpdate", kwis)
    })

    socket.on("stem", (id: string) => {
        let antwoordIdx = antwoorden.findIndex((a) => a.spelerId == id);
        antwoorden[antwoordIdx].stemmen = antwoorden[antwoordIdx].stemmen + 1;
        stuurNaarAdmin("stemKennisgeving", id)
    })

    socket.on("puntentelling", (puntenMap: Array<[string, number]>) => {
        console.log("[puntentelling]")
        console.dir(puntenMap)

        for (let [id, punten] of puntenMap) {
            gasten = ageer(id, (g: Gast) => {
                g.punten = punten;
                console.log(`speler ${g.naam} heeft nu ${punten} punten`);
                return gasten;
            })
        }
        kwis.fase = "stemresulatenPresenteren";
        io.emit("kwisUpdate", kwis);
        io.emit("scorebord", gasten.filter((e) => !e.admin))
    })

    socket.on("volgendeVraag", () => {
        console.log("[volgende vraag]")
        kwis.fase = "antwoordenVerzamelen";
        kwis.huidigeVraagIdx += 1;
        antwoorden = []
        io.emit("kwisUpdate", kwis);
    })

    socket.on("eindigKwis", () => {
        kwis.fase = "beëindigd"
        io.emit("kwisUpdate", kwis)
        console.log("[kwis klaar]")
    })
});

// for await (const line of console) {
//     try {
//         console.log(eval?.(line));
//     } catch (e) {
//         console.error(e)
//     }
// }