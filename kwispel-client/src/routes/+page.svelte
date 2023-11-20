<script lang="ts">
    function vrijheidGelijkheidEnZusterschap<T>(a: T[], b: T[]): boolean {
        for (let i = 0; i < a.length; i++) {
            if (a[i] != b[i]) {
                return false;
            }
        }

        return true;
    }

    import { fly } from "svelte/transition";

    import loadingImg from "../assets/loading.gif";
    import doneImg from "../assets/checkmark.png";

    import { io } from "socket.io-client";
    import type { Gast } from "$lib/Gast";
    import { standaardKwis, type Kwis } from "$lib/Kwis";

    $: spelers = [] as Gast[];

    function ageer<T>(id: string, functie: (gast: Gast) => T): T {
        let matchendeIds = spelers.filter((gast) => gast.id === id);
        if (matchendeIds.length === 1) {
            return functie(matchendeIds[0]);
        } else {
            throw Error(`[ERROR] meerdere gasten met id ${id} gevonden.`);
        }
    }

    function vulTemplateIn(antwoord: string[]): string {
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

    const socket = io("localhost:3141");

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

    socket.on("nieuweSpelerKennisgeving", (id: string) => {
        console.log("nieuwe speler gejoind");
        spelers = [
            ...spelers,
            { admin: false, naam: undefined, huidigeAntwoord: undefined, id },
        ];
    });

    socket.on(
        "spelerAntwoordKennisgeving",
        (id: string, huidigAntwoord: any) => {
            console.log(`speler ${id} gaf antwoord ${huidigAntwoord}`);
            spelers = ageer(id, (speler) => {
                speler.huidigeAntwoord = huidigAntwoord;
                return spelers;
            });
        }
    );

    $: teamNaamGekozen = false;
    $: teamNaam = "";

    socket.on("naamRegistratieKennisgeving", (id: string, naam: string) => {
        spelers = ageer(id, (speler) => {
            speler.naam = naam;
            return spelers;
        });
    });

    $: lokaleKwis = standaardKwis;

    let antwoordenTonenInterval: NodeJS.Timeout;

    let eigenAntwoord: any;

    socket.on("kwisUpdate", (nieuweStatus: Kwis) => {
        console.log("kwis update ontvangen");
        console.log(nieuweStatus);

        if (
            nieuweStatus.fase === "antwoordenPresenteren" &&
            lokaleKwis.fase === "antwoordenVerzamelen"
        ) {
            aantalStemmen = Array(spelers.length).fill(-1);

            antwoordenTonenInterval = setInterval(() => {
                let eersteOnzichtbaar = aantalStemmen.indexOf(-1);
                if (eersteOnzichtbaar !== -1) {
                    console.log("nieuw antwoord tonen");
                    aantalStemmen[eersteOnzichtbaar] = 0;
                } else {
                    let teVersturenAntwoorden = Array.from(
                        spelers.map((speler) => speler.huidigeAntwoord)
                    );

                    if (teVersturenAntwoorden.length != 0) {
                        console.log("antwoorden op");
                        socket.emit("klaarVoorStemmen", teVersturenAntwoorden);
                        clearInterval(antwoordenTonenInterval);
                    }
                }
            }, 1000);
        }

        if (nieuweStatus.fase === "stemmen") {
            gestemd = false;
        }

        lokaleKwis = nieuweStatus;
        tekstPlaceholders = extraheerPlaceholders();
    });

    $: gestemdeSpelers = [] as string[];

    socket.on("stemKennisgeving", (socketId: string, idx: number) => {
        console.log("er is gestemd op idx", idx);
        aantalStemmen[idx] += 1;
        gestemdeSpelers.push(socketId);

        if (gestemdeSpelers.length === spelers.length) {
            socket.emit("alleSpelersGestemd");
        }
    });

    function registreerNaam() {
        socket.emitWithAck("registreerNaam", teamNaam).then(() => {
            teamNaamGekozen = true;
        });
    }

    function startKwis() {
        console.log("kwis aan het starten");
        socket.emit("startKwis");
    }

    let antwoordVerstuurd = false;

    let tekstPlaceholders = [] as number[];
    let tekstInvoeren = [] as string[];

    $: antwoordenTeTonen = [] as any[];

    socket.on("antwoorden", (antwoorden) => {
        console.log("antwoorden ontvangen:", antwoorden);
        antwoordenTeTonen = antwoorden;
    });

    let aantalStemmen = [] as number[]; // VOLGORDE MOET OVEREENKOMEN MET DIE VAN DE SPELERS

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
        if (lokaleKwis.vragen[lokaleKwis.huidigeVraagIdx].soort === "tekst") {
            eigenAntwoord = tekstInvoeren;
            console.log(tekstInvoeren);
            socket.emit("verstuurAntwoord", tekstInvoeren);
        }
    }

    $: gestemd = false;

    function stem(idx: number) {
        gestemd = true;
        socket.emit("stem", idx);
    }
</script>

<div class="bg-blue-100 w-screen h-screen overflow-hidden p-16">
    <h1 class="text-3xl font-bold mb-6">kwispel</h1>
    {#if actieveVerbinding}
        <p class="mb-4">Verbonden met de spelserver: {socket.id}</p>

        {#if admin}
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
                        {#each spelers as speler}
                            <div
                                class="bg-blue-200 rounded-md p-4 mb-4 flex flex-row justify-between"
                            >
                                <h3 class="text-xl">{speler.naam}</h3>
                                <img
                                    class="w-8 aspect-square object-fit"
                                    src={speler.huidigeAntwoord === undefined
                                        ? loadingImg
                                        : doneImg}
                                    alt={"een laadicoontje"}
                                />
                            </div>
                        {/each}
                    </div>
                </div>
            {:else if lokaleKwis.fase == "antwoordenPresenteren" || lokaleKwis.fase == "stemmen"}
                <div class="flex flex-col gap-6 min-w-full">
                    {#each spelers.map((speler, idx) => {
                        return { sp: speler, i: idx };
                    }) as speler_en_idx}
                        {#if aantalStemmen[speler_en_idx.i] >= 0}
                            <div
                                class="p-4 text-lg bg-white rounded-md flex flex-col gap-2 min-w-full"
                                transition:fly={{
                                    y: 200,
                                    duration: 500,
                                }}
                            >
                                {#if lokaleKwis.vragen[lokaleKwis.huidigeVraagIdx].soort == "tekst"}
                                    <p>
                                        {vulTemplateIn(
                                            speler_en_idx.sp.huidigeAntwoord
                                        )}
                                    </p>
                                {/if}
                                <div
                                    class="bg-blue-300 p-3 min-w-full text-lg font-bold"
                                >
                                    {aantalStemmen[speler_en_idx.i]}
                                    {aantalStemmen[speler_en_idx.i] === 1
                                        ? " stem"
                                        : " stemmen"}
                                </div>
                            </div>
                        {/if}
                    {/each}
                </div>
            {/if}
        {:else if !teamNaamGekozen}
            <div
                class="bg-white rounded-md shadow-md p-4 flex flex-col max-w-min gap-4"
            >
                <p>Kies een teamnaam.</p>
                <input
                    bind:value={teamNaam}
                    placeholder="De Kwiskundigen"
                    class="p-3 border rounded-sm border-blue-800"
                />
                <br />
                <button
                    class="rounded-md text-white bg-blue-500 p-3 hover:bg-blue-800 transition-all"
                    on:click={registreerNaam}>Registreer!</button
                >
            </div>
        {:else if lokaleKwis.fase == "nogNietBegonnen"}
            <h3 class="text-xl mb-3">Welkom, <b>{teamNaam}</b>.</h3>
            <p>Het is nu een kwestie van wachten tot de kwis van start gaat.</p>
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
                        class="rounded-md text-white bg-blue-500 p-3 hover:bg-blue-800 transition-all"
                        on:click={verstuurAntwoord}>Dien antwoord in</button
                    >
                </div>
            {/if}
        {:else if lokaleKwis.fase == "stemmen" || lokaleKwis.fase == "stemresulatenPresenteren"}
            {#if !gestemd}
                <div class="flex flex-col gap-4">
                    {#each antwoordenTeTonen.map((antwoord, idx) => {
                        return { ant: antwoord, i: idx };
                    }) as antwoord_en_idx}
                        {#if lokaleKwis.vragen[lokaleKwis.huidigeVraagIdx].soort === "tekst"}
                            <button
                                class="bg-white rounded-md hover:bg-blue-500 text-blue-800 hover:text-white transition-all p-4 disabled:bg-gray-300 disabled:text-gray-800"
                                disabled={vrijheidGelijkheidEnZusterschap(
                                    antwoord_en_idx.ant,
                                    eigenAntwoord
                                )}
                                on:click={() => stem(antwoord_en_idx.i)}
                            >
                                <p>
                                    {vulTemplateIn(antwoord_en_idx.ant)}
                                </p>
                                {#if vrijheidGelijkheidEnZusterschap(antwoord_en_idx.ant, eigenAntwoord)}
                                    <p class="text-sm">
                                        Zeg, flauwe plezante, da's uw eigen
                                        antwoord.
                                    </p>
                                {/if}
                            </button>
                        {/if}
                    {/each}
                </div>
            {:else}
                <p>Bedankt voor je stem! We wachten nog op de rest.</p>
            {/if}
        {/if}
    {:else}
        <p>
            Niet verbonden. De spelserver kan offline zijn, of je bent zelf
            offline. Geen idee tbh.
        </p>
    {/if}
</div>
