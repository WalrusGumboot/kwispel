<script lang="ts">
    import { fly } from "svelte/transition";

    import loadingImg from "../assets/loading.gif";
    import doneImg from "../assets/checkmark.png";
    import winalied from "../assets/winalied.wav";

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
        stijl,
    } from "$lib/Stijlen";
    import Teambadge from "$lib/Teambadge.svelte";
    import FotoUploader from "$lib/FotoUploader.svelte";

    import { Gallery } from "flowbite-svelte";

    $: lokaleKwis = standaardKwis;

    function ageer<T>(id: string, functie: (gast: Gast) => T): T {
        let matchendeIds = lokaleKwis.spelers.filter((gast) => gast.id === id);
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
            lokaleKwis.spelers = [
                ...lokaleKwis.spelers,
                { naam, id, richting, punten: 0, admin: false },
            ];
        },
    );

    let antwoordenTonenInterval: NodeJS.Timeout;
    const ANTWOORDEN_TUSSENPOOS = 1000;
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
            }, ANTWOORDEN_TUSSENPOOS);
        }

        if (nieuweStatus.fase === "antwoordenVerzamelen") {
            fotoData = ""; // dit werkt want "" is falsy in JavaScript
            antwoordVerstuurd = false;
        }

        if (nieuweStatus.fase === "antwoordenPresenteren") {
            gestemd = false;
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

    socket.on("weeskindKennisgeving", (kwis: Kwis) => {
        integreerKwis(kwis);
        checkVoorStemVolledigheid();
    });

    socket.on("stemKennisgeving", (id: string) => {
        console.log("er is gestemd op antwoord van id ", id);

        let antwoordIdx = antwoorden.findIndex((a) => a.spelerId == id);
        antwoorden[antwoordIdx].stemmen = antwoorden[antwoordIdx].stemmen + 1;

        checkVoorStemVolledigheid();
    });

    function checkVoorStemVolledigheid() {
        // dit voorkomt het stilvallen van het spel als er twee verbindingen zijn, waarvan er eentje wegvalt tijdens het stemmen
        if (lokaleKwis.spelers.length === 1 && antwoorden[0].stemmen === 0) {
            antwoorden[0].stemmen = 1;
        }

        let aantalStemmen = antwoorden
            .map((a) => a.stemmen)
            .reduce((prev, current) => prev + current, 0);

        if (aantalStemmen == lokaleKwis.spelers.length) {
            console.log("genoeg stemmen bereikt; iedereen heeft gestemd.");

            console.log(lokaleKwis.spelers);

            for (let antwoord of antwoorden) {
                lokaleKwis.spelers = ageer(antwoord.spelerId, (g) => {
                    g.punten += PUNTEN_PER_STEM * antwoord.stemmen;
                    return lokaleKwis.spelers;
                });
            }

            lokaleKwis = lokaleKwis;

            let puntenMap: Map<string, number> = new Map();

            for (let speler of lokaleKwis.spelers) {
                puntenMap.set(speler.id, speler.punten);
            }

            console.dir(puntenMap);
            // serialisatie shit
            socket.emit("puntentelling", Array.from(puntenMap.entries()));
        }
    }

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

    function spelerInfo() {
        console.log("Spelers:");
        console.dir(lokaleKwis.spelers);
        console.log("Weeskinderen:");
        console.dir(lokaleKwis.weeskinderen);
    }

    function kwisStatusForceer(status: string) {
        socket.emit("forceerKwisStatus", status);
    }

    function logKwisStatus() {
        console.log(lokaleKwis);
    }

    let alGezochtNaarKinders = false;

    function startHerverbindbaarQueeste() {
        socket.emit("watZullenWeHerverbinden", (weeskinders: Gast[]) => {
            alGezochtNaarKinders = true;
            lokaleKwis.weeskinderen = weeskinders;
        });
    }

    function geefInfoBroer(weeskind: Gast) {
        socket.emit("infoburstAanvraag", weeskind, (kwisStatus: Kwis) => {
            integreerKwis(kwisStatus);
            teamNaamGekozen = true;
            teamNaam = weeskind.naam!;
            richting = weeskind.richting!;
        });
    }

    function puntenVoorTeam(richting: Richting, groepSpelers: Gast[]): number {
        return groepSpelers
            .filter((e) => e.richting == richting)
            .reduce((acc, curr) => acc + curr.punten, 0);
    }

    let adminPanel = false;
    let adminPanelBreedte;

    function togglePaneel() {
        adminPanel = !adminPanel;
    }

    function kickSpeler(id: string) {
        socket.emit("kickSpeler", id);
    }

    socket.on("kickMededeling", () => {
        socket.close();
        actieveVerbinding = false;
        window.close();
    });
</script>

{#key richting}
    <div class={stijl(achtergrondStijl, richting)}>
        <div class="flex flex-row gap-x-6 mb-6">
            <button on:click={togglePaneel} class="text-4xl font-bold"
                >kwispel</button
            >
        </div>
        {#if actieveVerbinding}
            <!-- <p class="mb-4">Verbonden met de spelserver: {socket.id}</p> -->
            {#if admin}
                <!-- <audio src={winalied} autoplay /> -->
                {#if adminPanel}
                    <div
                        bind:clientWidth={adminPanelBreedte}
                        transition:fly={{ x: adminPanelBreedte }}
                        class="absolute top-0 right-0 h-screen flex flex-col content-stretch gap-4 mb-4 bg-white px-8 py-3"
                    >
                        <h2 class="underline mb-2 text-gray-600 text-xl">
                            Forceer kwisstatus
                        </h2>
                        <button
                            class="rounded-md text-white bg-blue-500 p-3 hover:bg-blue-800 transition-all"
                            on:click={() =>
                                kwisStatusForceer("antwoordenVerzamelen")}
                        >
                            Antwoorden verzamelen
                        </button>
                        <button
                            class="rounded-md text-white bg-blue-500 p-3 hover:bg-blue-800 transition-all"
                            on:click={() =>
                                kwisStatusForceer("antwoordenPresenteren")}
                        >
                            Antwoorden presenteren
                        </button>
                        <button
                            class="rounded-md text-white bg-blue-500 p-3 hover:bg-blue-800 transition-all"
                            on:click={() => kwisStatusForceer("stemmen")}
                        >
                            Stemmen
                        </button>
                        <button
                            class="rounded-md text-white bg-blue-500 p-3 hover:bg-blue-800 transition-all"
                            on:click={() =>
                                kwisStatusForceer("stemresulatenPresenteren")}
                        >
                            Stemresulaten presenteren
                        </button>
                        <button
                            class="rounded-md text-white bg-blue-500 p-3 hover:bg-blue-800 transition-all"
                            on:click={logKwisStatus}
                        >
                            Kwisstatus
                        </button>
                        <h2 class="underline mb-2 text-gray-600 text-xl">
                            console.log
                        </h2>
                        <button
                            class="rounded-md text-white bg-blue-500 p-3 hover:bg-blue-800 transition-all"
                            on:click={spelerInfo}
                        >
                            Spelerinformatie
                        </button>
                        <div class="grow" />
                        <button
                            class="rounded-md text-white bg-blue-500 p-3 hover:bg-blue-800 transition-all"
                            on:click={togglePaneel}
                        >
                            sluit paneel
                        </button>
                    </div>
                {/if}
                {#if lokaleKwis.fase == "nogNietBegonnen"}
                    <Gallery class="grid-cols-3 gap-3">
                        {#key lokaleKwis}
                            {#each lokaleKwis.spelers as speler}
                                <div
                                    class="bg-white p-4 rounded-md flex-row justify-between group"
                                    transition:fly={{ y: 30 }}
                                >
                                    <div>
                                        <p class="text-xl font-bold">
                                            {speler.naam}
                                        </p>
                                        <p class="text-sm">{speler.id}</p>
                                        <p class="text-sm">
                                            {speler.richting?.toString()}
                                        </p>
                                    </div>
                                    <button
                                        on:click={() => {
                                            kickSpeler(speler.id);
                                        }}
                                        class="bg-red-500 text-white p-2 group-hover:opacity-100 opacity-0 hover:bg-red-800 transition-all rounded-md"
                                    >
                                        kick
                                    </button>
                                </div>
                            {/each}
                            {#if lokaleKwis.spelers.length >= 2}
                                <button
                                    class="rounded-md text-white bg-blue-500 p-3 hover:bg-blue-800 transition-all"
                                    on:click={startKwis}>start kwis</button
                                >
                            {/if}
                        {/key}
                    </Gallery>
                {:else if lokaleKwis.fase == "antwoordenVerzamelen"}
                    <div class="flex flex-col gap-6">
                        <div
                            id="vraagstelling"
                            class="basis-1/3 rounded-md bg-white shadow-md p-6 mb-6 flex flex-row items-center justify-center"
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
                            {#key lokaleKwis}
                                <!-- spelers verliezen mss verbinding -->
                                {#each lokaleKwis.spelers as speler}
                                    <div
                                        class="bg-blue-200 rounded-md p-4 mb-4 flex flex-row justify-between"
                                    >
                                        <h3 class="text-xl">{speler.naam}</h3>
                                        <img
                                            class="w-8 h-8 object-fit"
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
                    <div
                        id="vraagstelling"
                        class="basis-1/3 rounded-md bg-white shadow-md p-6 mb-6 flex flex-row items-center justify-center"
                    >
                        <h2
                            class="text-3xl font-bold text-blue-800 drop-shadow-sm"
                        >
                            {lokaleKwis.vragen[
                                lokaleKwis.huidigeVraagIdx
                            ].tekst.replaceAll("{}", "_____")}
                        </h2>
                    </div>
                    {#if lokaleKwis.vragen[lokaleKwis.huidigeVraagIdx].soort == "tekst"}
                        <Gallery class="grid-cols-5 gap-6">
                            {#each antwoorden.toReversed() as antwoord}
                                {#if antwoord.getoond}
                                    <div
                                        class="p-4 text-lg bg-white rounded-md min-w-full"
                                        transition:fly={{
                                            y: 200,
                                            duration: 500,
                                        }}
                                    >
                                        <p>
                                            {antwoord.data}
                                        </p>
                                    </div>
                                {/if}
                            {/each}
                        </Gallery>
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
                        class="flex flex-row min-w-full gap-6 mb-12 justify-stretch"
                    >
                        <div
                            class="rounded-md bg-white p-6 flex flex-col gap-3"
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
                            class="rounded-md bg-white p-6 flex flex-col gap-3"
                        >
                            <h2 class="text-2xl font-bold text-blue-800 mb-6">
                                Leaderboard
                            </h2>
                            {#key lokaleKwis}
                                {#each lokaleKwis.spelers.toSorted((a, b) => b.punten - a.punten) as speler}
                                    <div
                                        class={stijl(
                                            eigenSpelerStijl,
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
                        class={stijl(knopStijl, richting)}
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
                            >{lokaleKwis.spelers.toSorted(
                                (a, b) => b.punten - a.punten,
                            )[0].naam}</b
                        >!
                    </h2>

                    <div
                        class="mb-4 flex flex-row min-w-max gap-12 justify-stretch"
                    >
                        <div
                            class="bg-wiskunde-200 p-4 rounded-md flex flex-col gap-3 align-center items-center justify-center"
                        >
                            <h3 class="text-xl">
                                Team <span class="text-wiskunde-700 font-bold"
                                    >Wiskunde</span
                                >
                                heeft {puntenVoorTeam(
                                    "Wiskunde",
                                    lokaleKwis.spelers,
                                )} punten gescoord!
                            </h3>
                        </div>

                        <div
                            class="bg-fysica-200 p-4 rounded-md flex flex-col gap-3 align-center items-center justify-center"
                        >
                            <h3 class="text-xl">
                                Team <span class="text-fysica-700 font-bold"
                                    >Fysica</span
                                >
                                heeft {puntenVoorTeam(
                                    "Fysica",
                                    lokaleKwis.spelers,
                                )} punten gescoord!
                            </h3>
                        </div>
                    </div>

                    <div class="rounded-md bg-white p-12 flex flex-col gap-3">
                        {#each lokaleKwis.spelers.toSorted((a, b) => b.punten - a.punten) as speler}
                            <div
                                class={stijl(eigenSpelerStijl, speler.richting)}
                            >
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
                        {#if lokaleKwis.weeskinderen.length == 0}
                            <p>Geen herverbindbare spelers gevonden.</p>
                        {:else}
                            {#each lokaleKwis.weeskinderen as weeskind}
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
                    gaat, of tot de volgende vraag gesteld wordt.
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
                            class={stijl(knopStijl, richting)}
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
                                    class={stijl(
                                        antwoordStemKnopStijl,
                                        richting,
                                    )}
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
                                    class={stijl(
                                        antwoordStemKnopStijl,
                                        richting,
                                    )}
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
                <h2 class={stijl(headingStijl, richting)}>Leaderboard</h2>
                <div class="flex flex-col gap-6 min-w-full justify-stretch">
                    {#each lokaleKwis.spelers.toSorted((a, b) => b.punten - a.punten) as speler}
                        {#if speler.id == socket.id}
                            <div class={stijl(eigenSpelerStijl, richting)}>
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
                offline.
            </p>
        {/if}
    </div>
{/key}
