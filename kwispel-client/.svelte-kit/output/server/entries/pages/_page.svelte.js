import { c as create_ssr_component, d as add_attribute, f as each, e as escape, v as validate_component } from "../../chunks/ssr.js";
import { io } from "socket.io-client";
const loadingImg = "/_app/immutable/assets/loading.82076465.gif";
const doneImg = "/_app/immutable/assets/checkmark.b4d79015.png";
const PUNTEN_PER_STEM = 100;
const standaardKwis = {
  vragen: [
    { soort: "tekst", tekst: "De salamanders van Vaes be like: 'Senior, commilitones, laat ons drinken op {}!'" },
    { soort: "tekst", tekst: "Uw moeder is zo {} dat ze {}." }
  ],
  huidigeVraagIdx: 0,
  fase: "nogNietBegonnen"
};
const achtergrondStijl = /* @__PURE__ */ new Map([
  [void 0, "bg-blue-100 w-screen min-h-screen overflow-hidden p-16"],
  ["Wiskunde", "bg-wiskunde-100 w-screen min-h-screen overflow-hidden p-16"],
  ["Fysica", "bg-fysica-100 w-screen min-h-screen overflow-hidden p-16"]
]);
const knopStijl = /* @__PURE__ */ new Map([
  [void 0, "rounded-md text-white bg-blue-500 p-3 hover:bg-blue-800 transition-all"],
  ["Wiskunde", "rounded-md text-white bg-wiskunde-500 p-3 hover:bg-wiskunde-800 transition-all"],
  ["Fysica", "rounded-md text-white bg-fysica-500 p-3 hover:bg-fysica-800 transition-all"]
]);
const antwoordStemKnopStijl = /* @__PURE__ */ new Map([
  [void 0, "bg-white rounded-md hover:bg-blue-500 text-blue-800 hover:text-white transition-all p-4 disabled:bg-gray-300 disabled:text-gray-800"],
  ["Wiskunde", "bg-white rounded-md hover:bg-wiskunde-500 text-wiskunde-800 hover:text-white transition-all p-4 disabled:bg-gray-300 disabled:text-gray-800"],
  ["Fysica", "bg-white rounded-md hover:bg-fysica-500 text-fysica-800 hover:text-white transition-all p-4 disabled:bg-gray-300 disabled:text-gray-800"]
]);
const headingStijl = /* @__PURE__ */ new Map([
  [void 0, "text-2xl font-bold text-blue-800 mb-6"],
  ["Wiskunde", "text-2xl font-bold text-wiskunde-800 mb-6"],
  ["Fysica", "text-2xl font-bold text-fysica-800 mb-6"]
]);
const eigenSpelerStijl = /* @__PURE__ */ new Map([
  [void 0, "bg-amber-200 p-4 rounded-md"],
  ["Wiskunde", "bg-wiskunde-200 p-4 rounded-md"],
  ["Fysica", "bg-fysica-200 p-4 rounded-md"]
]);
const spelerAntwoordLaadStijl = /* @__PURE__ */ new Map([
  [void 0, "bg-blue-200 rounded-md p-4 mb-4 flex flex-row justify-between"],
  ["Wiskunde", "bg-wiskunde-200 rounded-md p-4 mb-4 flex flex-row justify-between"],
  ["Fysica", "bg-fysica-200 rounded-md p-4 mb-4 flex flex-row justify-between"]
]);
const Teambadge = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { richting } = $$props;
  if ($$props.richting === void 0 && $$bindings.richting && richting !== void 0)
    $$bindings.richting(richting);
  return `${richting == "Wiskunde" ? `<div class="px-3 py-2 rounded-md text-white bg-wiskunde-500 max-w-min" data-svelte-h="svelte-12vpweo">Wiskunde</div>` : `${richting == "Fysica" ? `<div class="px-3 py-2 rounded-md text-white bg-fysica-500 max-w-min" data-svelte-h="svelte-1azd9fg">Fysica</div>` : ``}`}`;
});
function puntenVoorTeam(richting2, groepSpelers) {
  return groepSpelers.filter((e) => e.richting == richting2).reduce((acc, curr) => acc + curr.punten, 0);
}
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let spelers;
  let actieveVerbinding;
  let admin;
  let teamNaamGekozen;
  let teamNaam;
  let richting;
  let lokaleKwis;
  let antwoorden;
  let leaderboardInfo;
  let gestemd;
  let weeskinderen;
  function ageer(id, functie) {
    let matchendeIds = spelers.filter((gast) => gast.id === id);
    if (matchendeIds.length === 1) {
      return functie(matchendeIds[0]);
    } else {
      throw Error(`[ERROR] meerdere gasten met id ${id} gevonden.`);
    }
  }
  function vulTemplateIn(antwoord) {
    let templateTekst = lokaleKwis.vragen[lokaleKwis.huidigeVraagIdx].tekst;
    let antwoordIndex = 0;
    do {
      let delen = templateTekst.split("{}");
      templateTekst = delen.shift().concat(antwoord[antwoordIndex], delen.join("{}"));
      antwoordIndex++;
    } while (templateTekst.includes("{}"));
    return templateTekst;
  }
  const socket = io("0.0.0.0:3141");
  socket.on("connect", () => {
    actieveVerbinding = true;
  });
  socket.on("disconnect", () => {
    actieveVerbinding = false;
  });
  socket.on("adminKennisgeving", () => {
    admin = true;
  });
  socket.on("naamRegistratieKennisgeving", (id, naam, richting2) => {
    spelers = [
      ...spelers,
      {
        naam,
        id,
        richting: richting2,
        punten: 0,
        admin: false
      }
    ];
  });
  let antwoordenTonenInterval;
  socket.on("declareerAntwoorden", (alleAntwoorden) => {
    antwoorden = alleAntwoorden;
  });
  function integreerKwis(nieuweStatus) {
    console.log("kwis update ontvangen");
    console.log(nieuweStatus);
    if (nieuweStatus.fase === "antwoordenPresenteren" && lokaleKwis.fase === "antwoordenVerzamelen" && admin) {
      antwoordenTonenInterval = setInterval(
        () => {
          let eersteOnzichtbaar = antwoorden.findIndex((a) => !a.getoond);
          if (eersteOnzichtbaar !== -1) {
            console.log("nieuw antwoord tonen");
            antwoorden[eersteOnzichtbaar].getoond = true;
          } else {
            clearInterval(antwoordenTonenInterval);
            socket.emit("klaarVoorStemmen");
          }
        },
        1e3
      );
    }
    if (nieuweStatus.fase === "stemmen") {
      gestemd = false;
    }
    if (nieuweStatus.fase === "antwoordenVerzamelen") {
      antwoordVerstuurd = false;
    }
    lokaleKwis = nieuweStatus;
    tekstPlaceholders = extraheerPlaceholders();
  }
  socket.on("kwisUpdate", (nieuweStatus) => {
    integreerKwis(nieuweStatus);
  });
  socket.on("antwoordKennisgeving", (antwoord) => {
    console.log("nieuw antwoord binnengekregen");
    antwoorden = [...antwoorden, antwoord];
  });
  socket.on("weeskindKennisgeving", (weeskind) => {
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
  socket.on("idVeranderingKennisgeving", (geadopteerdKindId, nieuweId) => {
    let geadopteedKind = weeskinderen.find((e) => e.id === geadopteerdKindId);
    geadopteedKind.id = nieuweId;
    spelers = [...spelers, geadopteedKind];
  });
  socket.on("stemKennisgeving", (id) => {
    console.log("er is gestemd op antwoord van id ", id);
    let antwoordIdx = antwoorden.findIndex((a) => a.spelerId == id);
    antwoorden[antwoordIdx].stemmen = antwoorden[antwoordIdx].stemmen + 1;
    checkVoorStemVolledigheid();
  });
  function checkVoorStemVolledigheid() {
    if (spelers.length === 1 && antwoorden[0].stemmen === 0) {
      antwoorden[0].stemmen = 1;
    }
    let aantalStemmen = antwoorden.map((a) => a.stemmen).reduce((prev, current) => prev + current, 0);
    if (aantalStemmen == spelers.length) {
      console.log("genoeg stemmen bereikt; iedereen heeft gestemd.");
      console.log(spelers);
      for (let antwoord of antwoorden) {
        spelers = ageer(antwoord.spelerId, (g) => {
          g.punten += PUNTEN_PER_STEM * antwoord.stemmen;
          return spelers;
        });
      }
      let puntenMap = /* @__PURE__ */ new Map();
      for (let speler of spelers) {
        puntenMap.set(speler.id, speler.punten);
      }
      console.dir(puntenMap);
      socket.emit("puntentelling", Array.from(puntenMap.entries()));
    }
  }
  socket.on("scorebord", (scorebord) => {
    leaderboardInfo = scorebord;
  });
  let antwoordVerstuurd = false;
  let tekstPlaceholders = [];
  let tekstInvoeren = [];
  function extraheerPlaceholders() {
    let tekst = lokaleKwis.vragen[lokaleKwis.huidigeVraagIdx].tekst;
    let placeholders = [];
    tekstInvoeren = [];
    let index = 0;
    for (let _ in tekst.match(/{}/g)) {
      tekstInvoeren[index] = "";
      placeholders.push(index);
      index++;
    }
    return placeholders;
  }
  spelers = [];
  actieveVerbinding = false;
  admin = false;
  teamNaamGekozen = false;
  teamNaam = "";
  richting = void 0;
  lokaleKwis = standaardKwis;
  antwoorden = [];
  leaderboardInfo = [];
  gestemd = false;
  weeskinderen = [];
  return `<div${add_attribute("class", achtergrondStijl.get(richting), 0)}><h1 class="text-3xl font-bold mb-6" data-svelte-h="svelte-4y42f8">kwispel</h1> ${actieveVerbinding ? ` ${admin ? `<button class="rounded-md text-white bg-blue-500 p-3 hover:bg-blue-800 transition-all mb-4" data-svelte-h="svelte-uyn53j">Log spelerinformatie</button> ${lokaleKwis.fase == "nogNietBegonnen" ? `<h2 class="text-xl" data-svelte-h="svelte-1dhw251">Welkom, admin.</h2> <div class="flex flex-col bg-white rounded-md p-6 gap-3"><h3 class="text-lg" data-svelte-h="svelte-s72do9">Verbonden spelers</h3> <hr class="mb-2"> ${each(spelers, (speler) => {
    return `<p>${escape(speler.id)} heet ${escape(speler.naam)}</p>`;
  })} ${spelers.length >= 2 ? `<button class="rounded-md text-white bg-blue-500 p-3 hover:bg-blue-800 transition-all" data-svelte-h="svelte-17jds89">Start kwis</button>` : ``}</div>` : `${lokaleKwis.fase == "antwoordenVerzamelen" ? `<div class="flex flex-col gap-6"><div id="vraagstelling" class="basis-1/3 rounded-md bg-white shadow-md p-6 flex flex-row items-center justify-center"><h2 class="text-3xl font-bold text-blue-800 drop-shadow-sm">${escape(lokaleKwis.vragen[lokaleKwis.huidigeVraagIdx].tekst.replaceAll("{}", "_____"))}</h2></div> <div class="columns-2 p-6 basis-2/3"> ${each(spelers, (speler) => {
    return `<div${add_attribute("class", spelerAntwoordLaadStijl.get(speler.richting), 0)}><h3 class="text-xl">${escape(speler.naam)}</h3> <img class="w-8 aspect-square object-fit"${add_attribute(
      "src",
      antwoorden.some((a) => a.spelerId === speler.id) ? doneImg : loadingImg,
      0
    )}${add_attribute("alt", "een laadicoontje", 0)}> ${validate_component(Teambadge, "Teambadge").$$render($$result, { richting: speler.richting }, {}, {})} </div>`;
  })}</div></div>` : `${lokaleKwis.fase == "antwoordenPresenteren" || lokaleKwis.fase == "stemmen" ? `<div class="flex flex-col gap-6 min-w-full">${each(antwoorden, (antwoord) => {
    return `${antwoord.getoond ? `<div class="p-4 text-lg bg-white rounded-md flex flex-col gap-2 min-w-full">${lokaleKwis.vragen[lokaleKwis.huidigeVraagIdx].soort == "tekst" ? `<p>${escape(vulTemplateIn(antwoord.data))} </p>` : ``} </div>` : ``}`;
  })}</div>` : `${lokaleKwis.fase == "stemresulatenPresenteren" ? `<div class="flex flex-row min-w-full gap-12 mb-12 justify-stretch"><div class="rounded-md bg-white p-12 flex flex-col gap-3"><h2 class="text-2xl font-bold text-blue-800 mb-6" data-svelte-h="svelte-9bbxay">Antwoorden</h2> ${each(antwoorden, (antwoord) => {
    return `<div${add_attribute("class", eigenSpelerStijl.get(ageer(antwoord.spelerId, (g) => g.richting)), 0)}><p class="text-lg font-bold mb-3">${escape(ageer(antwoord.spelerId, (g) => g.naam))}</p> ${lokaleKwis.vragen[lokaleKwis.huidigeVraagIdx].soort == "tekst" ? `${escape(vulTemplateIn(antwoord.data))}` : ``} </div>`;
  })}</div> <div class="rounded-md bg-white p-12 flex flex-col gap-3"><h2 class="text-2xl font-bold text-blue-800 mb-6" data-svelte-h="svelte-h5is9q">Leaderboard</h2> ${each(spelers.toSorted((a, b) => b.punten - a.punten), (speler) => {
    return `<div${add_attribute("class", eigenSpelerStijl.get(speler.richting), 0)}><p>${escape(speler.naam)}: ${escape(speler.punten)}</p> ${validate_component(Teambadge, "Teambadge").$$render($$result, { richting: speler.richting }, {}, {})} </div>`;
  })}</div></div> <button${add_attribute("class", knopStijl.get(richting), 0)}>${escape(lokaleKwis.vragen.length - 1 == lokaleKwis.huidigeVraagIdx ? "Beëindig quiz" : "Volgende vraag")}</button>` : `${lokaleKwis.fase == "beëindigd" ? `<h2 class="text-3xl mb-8">Gefeliciteerd, <b>${escape(spelers.toSorted((a, b) => b.punten - a.punten)[0].naam)}</b>!</h2> <div class="mb-4 flex flex-row min-w-max gap-12 justify-stretch"><div class="bg-wiskunde-200 p-4 rounded-md flex flex-col gap-3 align-center items-center justify-center"><h3 class="text-xl">Team <span class="text-wiskunde-500 font-bold" data-svelte-h="svelte-5my7xu">Wiskunde</span> heeft ${escape(puntenVoorTeam("Wiskunde", spelers))} punten gescoord!</h3></div> <div class="bg-fysica-200 p-4 rounded-md flex flex-col gap-3 align-center items-center justify-center"><h3 class="text-xl">Team <span class="text-fysica-500 font-bold" data-svelte-h="svelte-cnqdg2">Fysica</span> heeft ${escape(puntenVoorTeam("Fysica", spelers))} punten gescoord!</h3></div></div> <div class="rounded-md bg-white p-12 flex flex-col gap-3">${each(spelers.toSorted((a, b) => b.punten - a.punten), (speler) => {
    return `<div${add_attribute("class", eigenSpelerStijl.get(speler.richting), 0)}><p>${escape(speler.naam)}: ${escape(speler.punten)}</p> </div>`;
  })}</div>` : ``}`}`}`}`}` : `${!teamNaamGekozen ? `<div class="bg-white rounded-md shadow-md p-4 flex flex-col min-w-max gap-4 mb-6"><p data-svelte-h="svelte-1qu625k">Kies een teamnaam.</p> <input placeholder="De Kwiskundigen" class="p-3 border rounded-sm border-blue-800"${add_attribute("value", teamNaam, 0)}> <br> <button class="rounded-md text-white bg-wiskunde-500 p-3 hover:bg-wiskunde-800 transition-all" data-svelte-h="svelte-1f0v9td">Registreer als wiskundeteam!</button> <button class="rounded-md text-white bg-fysica-500 p-3 hover:bg-fysica-800 transition-all" data-svelte-h="svelte-1i9b7bp">Registreer als fysicateam!</button></div> <div class="bg-white rounded-md shadow-md p-4 flex flex-col min-w-max gap-4"><p data-svelte-h="svelte-1vhvipl">Herverbind als je eerder de verbinding bent
                        kwijtgeraakt.</p> <button class="rounded-md text-white bg-blue-500 p-3 hover:bg-blue-800 transition-all" data-svelte-h="svelte-q9fj8q">Zoek naar herverbindbare spelers</button> ${weeskinderen.length == 0 ? `<p data-svelte-h="svelte-g6egmo">Geen herverbindbare spelers gevonden.</p>` : `${each(weeskinderen, (weeskind) => {
    return `<button class="p-3 min-w-full">${escape(weeskind.naam)} </button>`;
  })}`}</div>` : `${lokaleKwis.fase == "nogNietBegonnen" ? `<h3 class="text-xl mb-3">Welkom, <b>${escape(teamNaam)}</b>.</h3> <p data-svelte-h="svelte-16uusoz">Het is nu een kwestie van wachten tot de kwis van start
                    gaat.</p>` : `${lokaleKwis.fase == "antwoordenVerzamelen" ? `<h3 class="text-xl mb-3">Tijd om een antwoord te verzinnen, <b>${escape(teamNaam)}</b>.</h3> ${antwoordVerstuurd ? `<p data-svelte-h="svelte-1plnvbc">Bedankt voor je antwoord! Nu is het wachten tot de rest
                        klaar is.</p>` : `${lokaleKwis.vragen[lokaleKwis.huidigeVraagIdx].soort == "tekst" ? `<div class="flex flex-col gap-4">${each(tekstPlaceholders, (item) => {
    return `<input class="w-full rounded-md border p-3" placeholder="Geef een (partieel) antwoord in."${add_attribute("value", tekstInvoeren[item], 0)}>`;
  })} <button${add_attribute("class", knopStijl.get(richting), 0)}>Dien antwoord in</button></div>` : ``}`}` : `${lokaleKwis.fase == "stemmen" ? `${!gestemd ? `<div class="flex flex-col gap-4">${each(antwoorden, (antwoord) => {
    return `${lokaleKwis.vragen[lokaleKwis.huidigeVraagIdx].soort === "tekst" ? `<button${add_attribute("class", antwoordStemKnopStijl.get(richting), 0)} ${antwoord.spelerId == socket.id ? "disabled" : ""}><p>${escape(vulTemplateIn(antwoord.data))}</p> ${antwoord.spelerId == socket.id ? `<p class="text-sm" data-svelte-h="svelte-p7njq9">Zeg, flauwe plezante, da&#39;s uw eigen
                                            antwoord.
                                        </p>` : ``} </button>` : ``}`;
  })}</div>` : `<p data-svelte-h="svelte-iv8cd4">Bedankt voor je stem! We wachten nog op de rest.</p>`}` : `${lokaleKwis.fase == "stemresulatenPresenteren" ? `<h2${add_attribute("class", headingStijl.get(richting), 0)}>Leaderboard</h2> <div class="flex flex-col gap-6 min-w-full justify-stretch">${each(leaderboardInfo.toSorted((a, b) => b.punten - a.punten), (speler) => {
    return `${speler.id == socket.id ? `<div${add_attribute("class", eigenSpelerStijl.get(richting), 0)}><p class="font-bold">${escape(speler.naam)}: ${escape(speler.punten)}</p> ${validate_component(Teambadge, "Teambadge").$$render($$result, { richting: speler.richting }, {}, {})} </div>` : `<div class="bg-white p-4 rounded-md"><p>${escape(speler.naam)}: ${escape(speler.punten)}</p> ${validate_component(Teambadge, "Teambadge").$$render($$result, { richting: speler.richting }, {}, {})} </div>`}`;
  })}</div>` : ``}`}`}`}`}`}` : `<p>Niet verbonden. De spelserver kan offline zijn, of je bent zelf
                offline. Geen idee tbh. Let wel: als je dit bericht ziet terwijl
                je net in het spel zat, ben je een beetje fucked. Vraag Simeon
                even om dit te fiksen. Socket-id: ${escape(socket.id)}.</p>`}</div>`;
});
export {
  Page as default
};
