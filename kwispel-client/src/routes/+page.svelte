<script lang="ts">
    import { fly } from "svelte/transition";

    import loadingImg from "../assets/loading.gif";
    import doneImg from "../assets/checkmark.png";

    import { io } from "socket.io-client";
    import type { Gast, Richting } from "$lib/Gast";
    import { standaardKwis, type Kwis, PUNTEN_PER_STEM } from "$lib/Kwis";
    import type { Antwoord } from "$lib/Antwoord";
    import {
        achtergrondStijl,
        antwoordStemKnopStijl,
        eigenSpelerStijl,
        headingStijl,
        knopStijl,
    } from "$lib/Stijlen";
    import Teambadge from "$lib/Teambadge.svelte";
    import FotoUploader from "$lib/FotoUploader.svelte";

    import { Gallery } from "flowbite-svelte";

    $: spelers = [] as Gast[];

    function ageer<T>(id: string, functie: (gast: Gast) => T): T {
        let matchendeIds = spelers.filter((gast) => gast.id === id);
        if (matchendeIds.length === 1) {
            return functie(matchendeIds[0]);
        } else {
            throw Error(`[ERROR] meerdere gasten met id ${id} gevonden.`);
        }
    }

    function vulTemplateIn(antwoord: string[] | string): string {
        let templateTekst = lokaleKwis.vragen[lokaleKwis.huidigeVraagIdx].tekst;
        let antwoordIndex = 0;
        do {
            let delen = templateTekst.split("{}");
            templateTekst = delen
                .shift()!
                .concat(antwoord[antwoordIndex], delen.join("{}"));
            antwoordIndex++;
            //console.log(delen);
        } while (templateTekst.includes("{}"));

        return templateTekst;
    }

    const socket = io();

    $: actieveVerbinding = false;

    socket.on("connect", () => {
        actieveVerbinding = true;
    });
    socket.on("disconnect", () => {
        actieveVerbinding = false;
    });

    $: admin = false;

    socket.on("adminKennisgeving", () => {
        admin = true;
    });

    // socket.on("nieuweSpelerKennisgeving", (id: string) => {
    //     console.log("nieuwe speler gejoind");
    //     spelers = [
    //         ...spelers,
    //         { admin: false, naam: undefined, punten: 0, id },
    //     ];
    // });

    $: teamNaamGekozen = false;
    $: teamNaam = "";
    $: richting = undefined as Richting;

    socket.on(
        "naamRegistratieKennisgeving",
        (id: string, naam: string, richting: Richting) => {
            spelers = [
                ...spelers,
                { naam, id, richting, punten: 0, admin: false },
            ];
        },
    );

    $: lokaleKwis = standaardKwis;

    let antwoordenTonenInterval: NodeJS.Timeout;
    $: antwoorden = [] as Antwoord[];

    // wordt enkel naar spelers gestuurd, niet de admin
    socket.on("declareerAntwoorden", (alleAntwoorden: Antwoord[]) => {
        antwoorden = alleAntwoorden;
    });

    function integreerKwis(nieuweStatus: Kwis) {
        console.log("kwis update ontvangen");
        console.log(nieuweStatus);

        if (
            nieuweStatus.fase === "antwoordenPresenteren" &&
            lokaleKwis.fase === "antwoordenVerzamelen" &&
            admin
        ) {
            antwoordenTonenInterval = setInterval(() => {
                let eersteOnzichtbaar = antwoorden.findIndex((a) => !a.getoond);
                if (eersteOnzichtbaar !== -1) {
                    console.log("nieuw antwoord tonen");
                    antwoorden[eersteOnzichtbaar].getoond = true;
                } else {
                    clearInterval(antwoordenTonenInterval);
                    socket.emit("klaarVoorStemmen");
                }
            }, 1000);
        }

        if (nieuweStatus.fase === "stemmen") {
            gestemd = false;
        }

        if (nieuweStatus.fase === "antwoordenVerzamelen") {
            fotoData = ""; // dit werkt want "" is falsy in JavaScript
            antwoordVerstuurd = false;
        }

        lokaleKwis = nieuweStatus;
        tekstPlaceholders = extraheerPlaceholders();
    }

    socket.on("kwisUpdate", (nieuweStatus: Kwis) => {
        integreerKwis(nieuweStatus);
    });

    socket.on("antwoordKennisgeving", (antwoord: Antwoord) => {
        console.log("nieuw antwoord binnengekregen");
        antwoorden = [...antwoorden, antwoord];
    });

    socket.on("weeskindKennisgeving", (weeskind: Gast) => {
        console.log("weeskind kennisgeving");
        console.log(`weeskind: ${weeskind.id}`);
        spelers = spelers.filter((e) => {
            console.log(`elem: ${e.id}`);
            console.log(`exact gelijk: ${e.id === weeskind.id}`);
            console.log(`beetje gelijk: ${e.id == weeskind.id}`);
            return e.id !== weeskind.id;
        });
        checkVoorStemVolledigheid();
        weeskinderen = [...weeskinderen, weeskind];
    });

    socket.on(
        "idVeranderingKennisgeving",
        (geadopteerdKindId: string, nieuweId: string) => {
            let geadopteedKind = weeskinderen.find(
                (e) => e.id === geadopteerdKindId,
            )!;
            geadopteedKind.id = nieuweId;
            spelers = [...spelers, geadopteedKind];
        },
    );

    socket.on("stemKennisgeving", (id: string) => {
        console.log("er is gestemd op antwoord van id ", id);

        let antwoordIdx = antwoorden.findIndex((a) => a.spelerId == id);
        antwoorden[antwoordIdx].stemmen = antwoorden[antwoordIdx].stemmen + 1;

        checkVoorStemVolledigheid();
    });

    function checkVoorStemVolledigheid() {
        // dit voorkomt het stilvallen van het spel als er twee verbindingen zijn, waarvan er eentje wegvalt tijdens het stemmen
        if (spelers.length === 1 && antwoorden[0].stemmen === 0) {
            antwoorden[0].stemmen = 1;
        }

        let aantalStemmen = antwoorden
            .map((a) => a.stemmen)
            .reduce((prev, current) => prev + current, 0);

        if (aantalStemmen == spelers.length) {
            console.log("genoeg stemmen bereikt; iedereen heeft gestemd.");

            console.log(spelers);

            for (let antwoord of antwoorden) {
                spelers = ageer(antwoord.spelerId, (g) => {
                    g.punten += PUNTEN_PER_STEM * antwoord.stemmen;
                    return spelers;
                });
            }

            let puntenMap: Map<string, number> = new Map();

            for (let speler of spelers) {
                puntenMap.set(speler.id, speler.punten);
            }

            console.dir(puntenMap);
            // serialisatie shit
            socket.emit("puntentelling", Array.from(puntenMap.entries()));
        }
    }

    $: leaderboardInfo = [] as Gast[]; // enkel te gebruiken in speler als leaderboard info
    socket.on("scorebord", (scorebord) => {
        leaderboardInfo = scorebord;
    });

    function registreerNaam(gekozenRichting: Richting) {
        if (teamNaam.length == 0) {
            alert("Je naam kan niet leeg zijn, hè.");
            return;
        }
        socket
            .emitWithAck("registreerNaam", teamNaam, gekozenRichting)
            .then(() => {
                teamNaamGekozen = true;
                richting = gekozenRichting;
            });
    }

    function startKwis() {
        console.log("kwis aan het starten");
        socket.emit("startKwis");
    }

    let antwoordVerstuurd = false;

    let tekstPlaceholders = [] as number[];
    let tekstInvoeren = [] as string[];

    let fotoData: string;
    function fotoInstelCallback(data: string) {
        fotoData = data;
        console.log("foto ingesteld");
        verstuurAntwoord();
    }

    function extraheerPlaceholders(): number[] {
        let tekst = lokaleKwis.vragen[lokaleKwis.huidigeVraagIdx].tekst;
        let placeholders = [];
        tekstInvoeren = [];
        let index = 0;

        for (let _ in tekst.match(/{}/g)) {
            //console.log("found match, index nu", index);
            tekstInvoeren[index] = "";
            placeholders.push(index);
            index++;
        }

        // console.log(tekst);
        // console.log(placeholders);
        // console.log(tekstInvoeren);

        return placeholders;
    }

    function verstuurAntwoord() {
        antwoordVerstuurd = true;
        let teVersturenObject;

        if (lokaleKwis.vragen[lokaleKwis.huidigeVraagIdx].soort === "tekst") {
            teVersturenObject = tekstInvoeren;
        } else if (
            lokaleKwis.vragen[lokaleKwis.huidigeVraagIdx].soort === "foto"
        ) {
            teVersturenObject = fotoData;
        } else {
            throw Error("ERROR - geen verzendbare data");
        }

        console.log(teVersturenObject);

        socket.emit("verstuurAntwoord", {
            getoond: false,
            spelerId: socket.id,
            stemmen: 0,
            data: teVersturenObject,
        } satisfies Antwoord);
    }

    $: gestemd = false;

    function stem(id: string) {
        gestemd = true;
        socket.emit("stem", id);
    }

    function volgendeVraag() {
        antwoorden = [];
        socket.emit("volgendeVraag");
    }

    function eindigKwis() {
        socket.emit("eindigKwis");
    }

    $: weeskinderen = [] as Gast[];

    function spelerInfo() {
        console.log("Weeskinderen:");
        console.dir(weeskinderen);
        console.log("Spelers:");
        console.dir(spelers);
    }

    let alGezochtNaarKinders = false;

    function startHerverbindbaarQueeste() {
        socket.emit("watZullenWeHerverbinden", (weeskinders: Gast[]) => {
            alGezochtNaarKinders = true;
            weeskinderen = weeskinders;
        });
    }

    function geefInfoBroer(weeskind: Gast) {
        socket.emit("infoburstAanvraag", weeskind, (kwisStatus: Kwis) => {
            integreerKwis(kwisStatus);
            teamNaamGekozen = true;
            teamNaam = weeskind.naam!;
        });
    }

    function puntenVoorTeam(richting: Richting, groepSpelers: Gast[]): number {
        return groepSpelers
            .filter((e) => e.richting == richting)
            .reduce((acc, curr) => acc + curr.punten, 0);
    }
</script>

{#key richting}
    <div class={achtergrondStijl.get(richting)}>
        <h1 class="text-3xl font-bold mb-6">kwispel</h1>
        {#if actieveVerbinding}
            <!-- <p class="mb-4">Verbonden met de spelserver: {socket.id}</p> -->
            {#if admin}
                <button
                    class="rounded-md text-white bg-blue-500 p-3 hover:bg-blue-800 transition-all mb-4"
                    on:click={spelerInfo}
                >
                    Log spelerinformatie
                </button>
                {#if lokaleKwis.fase == "nogNietBegonnen"}
                    <h2 class="text-xl">Welkom, admin.</h2>
                    <div class="flex flex-col bg-white rounded-md p-6 gap-3">
                        <h3 class="text-lg">Verbonden spelers</h3>
                        <hr class="mb-2" />
                        {#key spelers}
                            {#each spelers as speler}
                                <p>{speler.id} heet {speler.naam}</p>
                            {/each}
                            {#if spelers.length >= 2}
                                <button
                                    class="rounded-md text-white bg-blue-500 p-3 hover:bg-blue-800 transition-all"
                                    on:click={startKwis}>Start kwis</button
                                >
                            {/if}
                        {/key}
                    </div>
                {:else if lokaleKwis.fase == "antwoordenVerzamelen"}
                    <div class="flex flex-col gap-6">
                        <div
                            id="vraagstelling"
                            class="basis-1/3 rounded-md bg-white shadow-md p-6 flex flex-row items-center justify-center"
                        >
                            <h2
                                class="text-3xl font-bold text-blue-800 drop-shadow-sm"
                            >
                                {lokaleKwis.vragen[
                                    lokaleKwis.huidigeVraagIdx
                                ].tekst.replaceAll("{}", "_____")}
                            </h2>
                        </div>
                        <div class="columns-2 p-6 basis-2/3">
                            {#key spelers}
                                <!-- spelers verliezen mss verbinding -->
                                {#each spelers as speler}
                                    <div
                                        class="bg-blue-200 rounded-md p-4 mb-4 flex flex-row justify-between"
                                    >
                                        <h3 class="text-xl">{speler.naam}</h3>
                                        <img
                                            class="w-8 aspect-square object-fit"
                                            src={antwoorden.some(
                                                (a) => a.spelerId === speler.id,
                                            )
                                                ? doneImg
                                                : loadingImg}
                                            alt={"een laadicoontje"}
                                        />
                                        <Teambadge richting={speler.richting} />
                                    </div>
                                {/each}
                            {/key}
                        </div>
                    </div>
                {:else if lokaleKwis.fase == "antwoordenPresenteren" || lokaleKwis.fase == "stemmen"}
                    {#if lokaleKwis.vragen[lokaleKwis.huidigeVraagIdx].soort == "tekst"}
                        <div class="flex flex-col gap-6 min-w-full">
                            {#each antwoorden as antwoord}
                                {#if antwoord.getoond}
                                    <div
                                        class="p-4 text-lg bg-white rounded-md min-w-full"
                                        transition:fly={{
                                            y: 200,
                                            duration: 500,
                                        }}
                                    >
                                        <p>
                                            {vulTemplateIn(antwoord.data)}
                                        </p>
                                    </div>
                                {/if}
                            {/each}
                        </div>
                    {:else if lokaleKwis.vragen[lokaleKwis.huidigeVraagIdx].soort == "foto"}
                        <Gallery class="gap-4 grid-cols-4">
                            {#each antwoorden.toReversed() as antwoord}
                                {#if antwoord.getoond}
                                    <div
                                        class="p-4 text-lg bg-white rounded-md min-w-full"
                                        transition:fly={{
                                            y: 200,
                                            duration: 500,
                                        }}
                                    >
                                        <img
                                            src={antwoord.data.toString()}
                                            alt="de geüploade afbeelding"
                                            class="w-max h-auto"
                                        />
                                    </div>
                                {/if}
                            {/each}
                        </Gallery>
                    {/if}
                {:else if lokaleKwis.fase == "stemresulatenPresenteren"}
                    <div
                        class="flex flex-row min-w-full gap-12 mb-12 justify-stretch"
                    >
                        <div
                            class="rounded-md bg-white p-12 flex flex-col gap-3"
                        >
                            <h2 class="text-2xl font-bold text-blue-800 mb-6">
                                Antwoorden
                            </h2>
                            {#each antwoorden.toSorted((a, b) => b.stemmen - a.stemmen) as antwoord}
                                <div class="bg-blue-200 rounded-md p-4">
                                    <p class="text-lg font-bold mb-3">
                                        {ageer(
                                            antwoord.spelerId,
                                            (g) => g.naam,
                                        )}

                                        ({antwoord.stemmen}
                                        {antwoord.stemmen == 1
                                            ? "stem"
                                            : "stemmen"})
                                    </p>
                                    {#if lokaleKwis.vragen[lokaleKwis.huidigeVraagIdx].soort == "tekst"}
                                        {vulTemplateIn(antwoord.data)}
                                    {:else if lokaleKwis.vragen[lokaleKwis.huidigeVraagIdx].soort == "foto"}
                                        <div
                                            class="grow h-16 rounded-md overflow-hidden"
                                        >
                                            <!-- deze gekke toString is nodig (ook al is het eigenlijk al een string) voor typechecking redenen -->
                                            <img
                                                class="object-fill"
                                                src={antwoord.data.toString()}
                                                alt="Het ingezonden antwoord"
                                            />
                                        </div>
                                    {/if}
                                </div>
                            {/each}
                        </div>
                        <div
                            class="rounded-md bg-white p-12 flex flex-col gap-3"
                        >
                            <h2 class="text-2xl font-bold text-blue-800 mb-6">
                                Leaderboard
                            </h2>
                            {#key spelers}
                                {#each spelers.toSorted((a, b) => b.punten - a.punten) as speler}
                                    <div
                                        class={eigenSpelerStijl.get(
                                            speler.richting,
                                        )}
                                    >
                                        <p>{speler.naam}: {speler.punten}</p>
                                        <Teambadge richting={speler.richting} />
                                    </div>
                                {/each}
                            {/key}
                        </div>
                    </div>
                    <button
                        class={knopStijl.get(richting)}
                        on:click={lokaleKwis.vragen.length - 1 ==
                        lokaleKwis.huidigeVraagIdx
                            ? () => {
                                  eindigKwis();
                              }
                            : () => {
                                  volgendeVraag();
                              }}
                        >{lokaleKwis.vragen.length - 1 ==
                        lokaleKwis.huidigeVraagIdx
                            ? "Beëindig quiz"
                            : "Volgende vraag"}</button
                    >
                {:else if lokaleKwis.fase == "beëindigd"}
                    <h2 class="text-3xl mb-8">
                        Gefeliciteerd, <b
                            >{spelers.toSorted((a, b) => b.punten - a.punten)[0]
                                .naam}</b
                        >!
                    </h2>

                    <div
                        class="mb-4 flex flex-row min-w-max gap-12 justify-stretch"
                    >
                        <div
                            class="bg-wiskunde-200 p-4 rounded-md flex flex-col gap-3 align-center items-center justify-center"
                        >
                            <h3 class="text-xl">
                                Team <span class="text-wiskunde-500 font-bold"
                                    >Wiskunde</span
                                >
                                heeft {puntenVoorTeam("Wiskunde", spelers)} punten
                                gescoord!
                            </h3>
                        </div>

                        <div
                            class="bg-fysica-200 p-4 rounded-md flex flex-col gap-3 align-center items-center justify-center"
                        >
                            <h3 class="text-xl">
                                Team <span class="text-fysica-500 font-bold"
                                    >Fysica</span
                                >
                                heeft {puntenVoorTeam("Fysica", spelers)} punten
                                gescoord!
                            </h3>
                        </div>
                    </div>

                    <div class="rounded-md bg-white p-12 flex flex-col gap-3">
                        {#each spelers.toSorted((a, b) => b.punten - a.punten) as speler}
                            <div class={eigenSpelerStijl.get(speler.richting)}>
                                <p>{speler.naam}: {speler.punten}</p>
                            </div>
                        {/each}
                    </div>
                {/if}
            {:else if !teamNaamGekozen}
                <div
                    class="bg-white rounded-md shadow-md p-4 flex flex-col min-w-max gap-4 mb-6"
                >
                    <p>Kies een teamnaam.</p>
                    <input
                        bind:value={teamNaam}
                        placeholder="De Kwiskundigen"
                        class="p-3 border rounded-sm border-blue-800"
                    />
                    <br />
                    <button
                        class="rounded-md text-white bg-wiskunde-500 p-3 hover:bg-wiskunde-800 transition-all"
                        on:click={() => registreerNaam("Wiskunde")}
                        >Registreer als wiskundeteam!</button
                    >
                    <button
                        class="rounded-md text-white bg-fysica-500 p-3 hover:bg-fysica-800 transition-all"
                        on:click={() => registreerNaam("Fysica")}
                        >Registreer als fysicateam!</button
                    >
                </div>
                <div
                    class="bg-white rounded-md shadow-md p-4 max-w-full flex flex-col gap-4"
                >
                    <p>
                        Herverbind als je eerder de verbinding bent
                        kwijtgeraakt. <b>Nota bene:</b> misschien nog een beetje
                        buggy.
                    </p>
                    <button
                        class="rounded-md text-white bg-blue-500 p-3 hover:bg-blue-800 transition-all"
                        on:click={startHerverbindbaarQueeste}
                        >Zoek naar herverbindbare spelers</button
                    >
                    {#if alGezochtNaarKinders}
                        {#if weeskinderen.length == 0}
                            <p>Geen herverbindbare spelers gevonden.</p>
                        {:else}
                            {#each weeskinderen as weeskind}
                                <button
                                    class="p-3 min-w-full"
                                    on:click={() => {
                                        geefInfoBroer(weeskind);
                                    }}
                                >
                                    {weeskind.naam}
                                </button>
                            {/each}
                        {/if}
                    {/if}
                </div>
            {:else if lokaleKwis.fase == "nogNietBegonnen"}
                <h3 class="text-xl mb-3">Welkom, <b>{teamNaam}</b>.</h3>
                <p>
                    Het is nu een kwestie van wachten tot de kwis van start
                    gaat.
                </p>
            {:else if lokaleKwis.fase == "antwoordenVerzamelen"}
                <h3 class="text-xl mb-3">
                    Tijd om een antwoord te verzinnen, <b>{teamNaam}</b>.
                </h3>
                {#if antwoordVerstuurd}
                    <p>
                        Bedankt voor je antwoord! Nu is het wachten tot de rest
                        klaar is.
                    </p>
                {:else if lokaleKwis.vragen[lokaleKwis.huidigeVraagIdx].soort == "tekst"}
                    <div class="flex flex-col gap-4">
                        {#each tekstPlaceholders as item}
                            <input
                                class="w-full rounded-md border p-3"
                                placeholder="Geef een (partieel) antwoord in."
                                bind:value={tekstInvoeren[item]}
                            />
                        {/each}
                        <button
                            class={knopStijl.get(richting)}
                            on:click={verstuurAntwoord}>Dien antwoord in</button
                        >
                    </div>
                {:else if lokaleKwis.vragen[lokaleKwis.huidigeVraagIdx].soort == "foto"}
                    <FotoUploader
                        spelerRichting={richting}
                        dataOntvangenCallback={fotoInstelCallback}
                    />
                {/if}
            {:else if lokaleKwis.fase == "stemmen"}
                {#if !gestemd}
                    {#if lokaleKwis.vragen[lokaleKwis.huidigeVraagIdx].soort === "tekst"}
                        <div class="flex flex-col columns-3xs gap-4">
                            {#each antwoorden as antwoord}
                                <button
                                    class={antwoordStemKnopStijl.get(richting)}
                                    disabled={antwoord.spelerId == socket.id}
                                    on:click={() => stem(antwoord.spelerId)}
                                >
                                    <p>
                                        {vulTemplateIn(antwoord.data)}
                                    </p>
                                    {#if antwoord.spelerId == socket.id}
                                        <p class="text-sm">
                                            Zeg, flauwe plezante, da's uw eigen
                                            antwoord.
                                        </p>
                                    {/if}
                                </button>
                            {/each}
                        </div>
                    {:else if lokaleKwis.vragen[lokaleKwis.huidigeVraagIdx].soort == "foto"}
                        <Gallery class="gap-4 grid-cols-3">
                            {#each antwoorden.toReversed() as antwoord}
                                <button
                                    class={antwoordStemKnopStijl.get(richting)}
                                    disabled={antwoord.spelerId == socket.id}
                                    on:click={() => stem(antwoord.spelerId)}
                                >
                                    <img
                                        class="w-max h-auto"
                                        src={antwoord.data.toString()}
                                        alt="Het ingezonden antwoord"
                                    />
                                    {#if antwoord.spelerId == socket.id}
                                        <p class="text-sm">
                                            Zeg, flauwe plezante, da's uw eigen
                                            antwoord.
                                        </p>
                                    {/if}
                                </button>
                                <!-- deze gekke toString is nodig (ook al is het eigenlijk al een string) voor typechecking redenen -->
                            {/each}
                        </Gallery>
                    {/if}
                {:else}
                    <p>Bedankt voor je stem! We wachten nog op de rest.</p>
                {/if}
            {:else if lokaleKwis.fase == "stemresulatenPresenteren"}
                <h2 class={headingStijl.get(richting)}>Leaderboard</h2>
                <div class="flex flex-col gap-6 min-w-full justify-stretch">
                    {#each leaderboardInfo.toSorted((a, b) => b.punten - a.punten) as speler}
                        {#if speler.id == socket.id}
                            <div class={eigenSpelerStijl.get(richting)}>
                                <p class="font-bold">
                                    {speler.naam}: {speler.punten}
                                </p>
                                <Teambadge richting={speler.richting} />
                            </div>
                        {:else}
                            <div class="bg-white p-4 rounded-md">
                                <p>{speler.naam}: {speler.punten}</p>
                                <Teambadge richting={speler.richting} />
                            </div>
                        {/if}
                    {/each}
                </div>
            {/if}
        {:else}
            <p>
                Niet verbonden. De spelserver kan offline zijn, of je bent zelf
                offline. Geen idee tbh. Let wel: als je dit bericht ziet terwijl
                je net in het spel zat, ben je een beetje fucked. Vraag Simeon
                even om dit te fiksen. Socket-id: {socket.id}.
            </p>
        {/if}
    </div>
{/key}
