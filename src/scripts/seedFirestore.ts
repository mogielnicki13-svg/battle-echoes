// ============================================================
// BATTLE ECHOES — seedFirestore.ts
// Jednorazowe zasilenie Firestore 15 bitwami historycznymi.
//
// WYMAGANIA:
//   Node.js ≥ 18  (natywny fetch)
//   ts-node        npm install -D ts-node
//
// PRZED URUCHOMIENIEM — tymczasowo zmień reguły Firestore:
//   match /battles/{id} { allow read, write: if true; }
//
// URUCHOMIENIE:
//   npx ts-node --project src/scripts/tsconfig.json src/scripts/seedFirestore.ts
//   npx ts-node --project src/scripts/tsconfig.json src/scripts/seedFirestore.ts --force
//   npx ts-node --project src/scripts/tsconfig.json src/scripts/seedFirestore.ts --dry-run
//
// FLAGI:
//   --force    nadpisz istniejące dokumenty
//   --dry-run  tylko wyświetl — bez zapisu
//
// PO ZAKOŃCZENIU — przywróć reguły:
//   match /battles/{id} { allow read: if true; allow write: if false; }
// ============================================================

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getFirestore, Firestore,
  writeBatch, doc, getDoc, getDocs, collection,
} from 'firebase/firestore';

// ── Konfiguracja Firebase (tożsama z src/constants/firebase.ts) ──
const FIREBASE_CONFIG = {
  apiKey:            'AIzaSyAVdHU1Rwfb4Mh7z9A0RWMWupRTLF2GB_k',
  authDomain:        'battle-echoes-63e55.firebaseapp.com',
  projectId:         'battle-echoes-63e55',
  storageBucket:     'battle-echoes-63e55.firebasestorage.app',
  messagingSenderId: '220331049837',
  appId:             '1:220331049837:web:bc4c47766975ea6de6d064',
} as const;

// ════════════════════════════════════════════════════════════
// TYPY
// ════════════════════════════════════════════════════════════
type Mood =
  | 'dramatic' | 'tense'  | 'melancholic' | 'triumphant'
  | 'brutal'   | 'strategic' | 'desperate' | 'heroic';

type Perspective = 'narrator' | 'side_a' | 'side_b';

interface Scene {
  id:          string;
  title:       string;
  mood:        Mood;
  duration:    number;       // sekundy
  text:        string;       // narracja PL
  perspective: Perspective;
}

interface SeedBattle {
  // ── Pola zgodne z istniejącym Battle interface (store) ──
  id:          string;
  name:        string;
  era:         string;
  date:        string;
  location:    { name: string; lat: number; lng: number };
  summary:     string;
  outcome:     string;
  sides:       [string, string];
  commanders:  string[];

  // ── Pola rozszerzone (nowe) ──
  subtitle:    string;
  year:        number;        // rok (ujemny dla p.n.e.)
  description: string;       // 3–5 zdań
  commanderA:  string;
  commanderB:  string;
  scenes:      Scene[];
  featured?:   boolean;
  imageUrl?:   string;       // URL do ikonicznego obrazu (Wikimedia Commons)
}

// ════════════════════════════════════════════════════════════
// DANE SEED — 15 bitew (3 zaktualizowane + 12 nowych)
// ════════════════════════════════════════════════════════════
const BATTLES: SeedBattle[] = [

  // ══════════════════════════════════════════════════════════
  // ERA: ANCIENT (-800 – 476)
  // ══════════════════════════════════════════════════════════
  {
    id: 'marathon-490bc',
    name: 'Bitwa pod Maratonem',
    subtitle: 'Dziesięć tysięcy przeciw imperium',
    era: 'ancient',
    year: -490,
    date: 'Wrzesień 490 r. p.n.e.',
    location: { name: 'Marathon, Grecja', lat: 38.1553, lng: 23.9590 },
    sides: ['Ateny i Plateje', 'Imperium Perskie'],
    commanders: ['Miltiades Młodszy', 'Datis i Artafernes'],
    commanderA: 'Miltiades Młodszy',
    commanderB: 'Datis i Artafernes',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/Scene_of_the_Battle_of_Marathon.jpg/800px-Scene_of_the_Battle_of_Marathon.jpg',
    summary: 'Ateńska falanga rozbiła perską armię desantową, ratując Grecję i pierwsze zaczątki demokracji.',
    outcome: 'Zwycięstwo Aten i Plateje',
    description:
      'Wrzesień 490 p.n.e. — perska flota 200 trirerm wysadza 25 000 żołnierzy w Zatoce Maratońskiej. ' +
      'Ateńczycy, wsparci jedynie przez Platejczyków, dysponują 10 000 hoplitów i muszą działać zanim Persowie dotrą do otwartego miasta. ' +
      'Miltiades, znający perską taktykę z własnej służby w ich armii, przekonuje radę do bezpośredniego ataku — przez otwartą równinę, biegiem w pełnej zbroi. ' +
      'Podwójne oskrzydlenie i klęska Persów w ciągu kilku godzin stały się prototypem taktyki, którą studiują żołnierze do dziś. ' +
      'Wiadomość o zwycięstwie dotarła do Aten w legendarnym biegu posłańca Feidippidesa.',
    featured: true,
    scenes: [
      {
        id: 'marathon_s1', perspective: 'narrator',
        title: 'Lądowanie Persów',
        mood: 'tense', duration: 240,
        text:
          'Wrzesień 490 roku przed naszą erą — perska flota zakotwicza w Zatoce Maratońskiej pod osłoną nocy. ' +
          'Datis i Artafernes, satrapi Dariusza Wielkiego, wysadzają blisko 25 tysięcy żołnierzy: łuczników, konnicę i ciężką piechotę. ' +
          'Równinę Marathon od Aten dzielą zaledwie czterdzieści kilometrów — droga, którą Persowie zamierzają pokonać, zanim obrońcy zdążą się zebrać. ' +
          'Posłaniec Feidippides wybiega w kierunku Sparty z prośbą o pomoc — Spartanie odmówią przez trwający właśnie festiwal religijny. ' +
          'Grecy stoją sami. Na ateńskim wzgórzu strażnicy widzą dymy obozowisk nieprzyjaciela.',
      },
      {
        id: 'marathon_s2', perspective: 'side_a',
        title: 'Rada Wojenna — Miltiades przemawia',
        mood: 'strategic', duration: 210,
        text:
          'W ateńskim obozie trwa gorąca debata: czekać za murami czy uderzyć w pole? ' +
          'Miltiades, który sam służył kiedyś w perskiej armii, zna jej słabości — lekkość uzbrojenia i brak zwartości przed uderzeniem ciężkiej piechoty. ' +
          'Przekonuje polemarchę Kallimacha oddającym swój decydujący głos: „Mamy teraz siłę — jeśli czekamy, strach podzieli obywateli." ' +
          'Dziesięć tysięcy hoplitów w ciężkiej brązowej zbroi szykuje się do marszu w dół ku równinie. ' +
          'Nikt nigdy dotąd nie szarżował na Persów biegiem.',
      },
      {
        id: 'marathon_s3', perspective: 'narrator',
        title: 'Szarża falangi — biegiem przez równinę',
        mood: 'dramatic', duration: 195,
        text:
          'O świcie falanga ateńska rusza przed siebie truchtem — a potem pełnym biegiem. ' +
          'Perscy łucznicy zaczynają ostrzał, lecz odległość jest zbyt duża, by strzały zebrały żniwo. ' +
          'Żelazna ściana tarcz i włóczni uderza w linie nieprzyjaciela z przytłaczającą siłą; centrum celowo cofa się wolniej, wciągając Persów w pułapkę. ' +
          'Lewe i prawe skrzydło falangi zamykają się jak szczypce wokół okrążonego wroga. ' +
          'Persowie, przyzwyczajeni do walki dystansowej, są bezradni w zwarciu z ciężko uzbrojonymi hoplitami.',
      },
      {
        id: 'marathon_s4', perspective: 'narrator',
        title: 'Triumf i bieg Feidippidesa',
        mood: 'triumphant', duration: 210,
        text:
          'Okrążeni Persowie łamią szyki i biegną ku okrętom przez trzęsawiska przybrzeżne — ateńscy hoplici ścigają ich bez litości. ' +
          'Zginęło 6 400 Persów; Ateńczycy stracili 192 obywateli — każdy pochowany z honorami w kurhanie na polu bitwy, gdzie ich mogiła stoi do dziś. ' +
          'Feidippides wybiega do Aten z wiadomością zwycięstwa, pokonując czterdzieści kilometrów w pełnym uzbrojeniu. ' +
          'Pada przed eklesją z okrzykiem „Nikiomen" — zwyciężyliśmy — i umiera. ' +
          'Perski król Dariusz notuję porażkę w swoich annałach; za dziesięć lat jego syn Kserkses wróci z armią liczoną w setkach tysięcy.',
      },
    ],
  },

  {
    id: 'cannae-216bc',
    name: 'Bitwa pod Kannami',
    subtitle: 'Okrążenie doskonałe',
    era: 'ancient',
    year: -216,
    date: '2 sierpnia 216 r. p.n.e.',
    location: { name: 'Canne della Battaglia, Włochy', lat: 41.3067, lng: 16.1311 },
    sides: ['Kartagina', 'Republika Rzymska'],
    commanders: ['Hannibal Barka', 'Gajusz Terencjusz Warron, Lucjusz Emiliusz Paullus'],
    commanderA: 'Hannibal Barka',
    commanderB: 'Gajusz Terencjusz Warron',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/The_Death_of_Paulus_Aemilius_at_the_Battle_of_Cannae_%28Yale_University_Art_Gallery_scan%29.jpg/800px-The_Death_of_Paulus_Aemilius_at_the_Battle_of_Cannae_%28Yale_University_Art_Gallery_scan%29.jpg',
    summary: 'Hannibal okrążył i zniszczył armię rzymską liczącą 86 000 żołnierzy — wzorzec taktyki okrążenia studiowany przez dowódców do dziś.',
    outcome: 'Druzgocące zwycięstwo Kartaginy',
    description:
      'Kannas to bitwa, której nie da się zapomnieć — 86 000 legionistów otoczonych i wymordowanych przez 50 000 wojsk Hannibala. ' +
      'Kartagiński wódz zastosował wklęsłą linię centrum, która wciągnęła napierających Rzymian w kocioł, po czym flanki i jazda zamknęły pierścień. ' +
      'Przez cztery godziny 47 000 żołnierzy zginęło w przestrzeni mniejszej niż dwa kilometry kwadratowe — tak stłoczonych, że nie mogli podnieść tarczy. ' +
      'Taktyka Hannibala weszła do wszystkich podręczników sztuki wojennej i zainspiruje każdego z Napoleona, Schlieffen i Rommla. ' +
      'Rzym przetrwał — ale Kannas na zawsze zmieniły jego myślenie o wojnie.',
    featured: true,
    scenes: [
      {
        id: 'cannae_s1', perspective: 'narrator',
        title: 'Pole nad Ofanto',
        mood: 'tense', duration: 230,
        text:
          'Drugi sierpień 216 roku przed naszą erą — nad brzegiem rzeki Ofanto ustawiają się dwie największe armie starożytnego świata. ' +
          'Po jednej stronie 86 tysięcy Rzymian, pewnych siebie po poprzednich klęskach Hannibala w mniejszych starciach; po drugiej — 50 tysięcy wielonarodowościowej armii Kartaginy. ' +
          'Sirocco — gorący, suchy wiatr z południa — unosi pył i zaślepia oczy legionistom stającym frontem do słońca. ' +
          'Konsulowie Warron i Paullus kłócą się o dowodzenie aż do ostatniej chwili; dziś dowodzi Warron, impulsywny i pewny szybkiego zwycięstwa. ' +
          'Hannibal na wzgórzu obserwuje szyki wroga i uśmiecha się.',
      },
      {
        id: 'cannae_s2', perspective: 'side_a',
        title: 'Pułapka — wklęsłe centrum',
        mood: 'strategic', duration: 260,
        text:
          'Hannibal ustawia centrum armii wysuniętym łukiem ku przodowi — celowo złożonym z najsłabszej iberyjskiej i galijskiej piechoty. ' +
          'Ciężka jazda kartagińska flankuje z lewej, zwrotni Numidyjczycy z prawej; afrykańska piechota stoi w gotowości na obu skrzydłach. ' +
          'Plat Hannibala: gdy Rzymianie uderzą w centrum z całą siłą, miękka linia zacznie ustępować jak sprężyna — wciągając legiony w głąb, ku pułapce. ' +
          'Warron widzi cofające się centrum i krzyczy: „Przełamujemy ich!" — i rzuca wszystkie rezerwy naprzód. ' +
          'Hannibal czeka na właściwy moment i wypowiada po grecku jedno słowo: „Teraz."',
      },
      {
        id: 'cannae_s3', perspective: 'narrator',
        title: 'Okrążenie doskonałe',
        mood: 'brutal', duration: 310,
        text:
          'Ciężka jazda kartagińska niszczy jazdę sojuszniczą na lewym skrzydle i okrąża całe pole od tyłu. ' +
          'Centrum, które wcześniej ustępowało, teraz prostuje się i zamyka z obu stron — zaawansowane legio otoczyły skrzydła africańskiej piechoty jak szczypce. ' +
          'Osiemdziesiąt tysięcy żołnierzy stłaczonych w przestrzeni jednego kilometra kwadratowego: nie można podnieść tarczy, nie można zadać ciosu, nie ma dokąd uciec. ' +
          'Rzeź trwa cztery godziny — konsul Paullus ginie na polu; Warron ucieka z kilkuset jeźdźcami. ' +
          'Kartagińscy żołnierze są tak zmęczeni zabijaniem, że proszą o przerwę. Hannibal jej odmawia.',
      },
      {
        id: 'cannae_s4', perspective: 'narrator',
        title: 'Wieczór po Kannach',
        mood: 'melancholic', duration: 210,
        text:
          'Gdy słońce zachodzi, pole bitwy pokryte jest 47 000 ciał legionistów — elita Republiki unicestwiona w jeden dzień. ' +
          'Kartagiński oficer Maharbal mówi do Hannibala: „Wyślij mnie z kawalerią — za pięć dni będziesz jadł kolację na Kapitolu." ' +
          'Hannibal odmawia. „Wiesz jak zwyciężać — nie wiesz jak korzystać ze zwycięstwa" — odpowiada Maharbal i odchodzi. ' +
          'Rzym pozbiera się, wyśle nowe legiony i zrekrutuje nastoletnich chłopców. Hannibal spędzi w Italii kolejne trzynaście lat bez decydującego zwycięstwa. ' +
          'Kannas wejdą do historii wojskowości jako wzorzec manewru na okrążenie — „własne Kannas" będzie marzeniem każdego dowódcy przez kolejne dwa tysiące lat.',
      },
    ],
  },

  // ══════════════════════════════════════════════════════════
  // ERA: MEDIEVAL (476 – 1500)
  // ══════════════════════════════════════════════════════════
  {
    id: 'grunwald-1410',
    name: 'Bitwa pod Grunwaldem',
    subtitle: 'Największa bitwa średniowiecznej Europy',
    era: 'medieval',
    year: 1410,
    date: '15 lipca 1410',
    location: { name: 'Grunwald, Polska', lat: 53.4833, lng: 20.1167 },
    sides: ['Królestwo Polskie i Wielkie Księstwo Litewskie', 'Zakon Krzyżacki'],
    commanders: ['Władysław II Jagiełło', 'Ulrich von Jungingen'],
    commanderA: 'Władysław II Jagiełło',
    commanderB: 'Ulrich von Jungingen',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/Jan_Matejko%2C_Bitwa_pod_Grunwaldem.jpg/800px-Jan_Matejko%2C_Bitwa_pod_Grunwaldem.jpg',
    summary: 'Jedna z największych bitew średniowiecznej Europy — zwycięstwo polsko-litewskie złamało potęgę Zakonu Krzyżackiego.',
    outcome: 'Zwycięstwo Polski i Litwy',
    description:
      'Piętnastego lipca 1410 roku na polach między Grunwaldem, Stębarkiem i Łodwigowem starły się dwie największe armie ówczesnej Europy. ' +
      'Wojska polsko-litewskie pod wodzą króla Jagiełły liczyły ok. 29 000 zbrojnych; Krzyżacy wystawili ok. 21 000 rycerzy i knechtów. ' +
      'Atak Krzyżaków na pozornie uciekające wojska litewskie okazał się śmiertelną pułapką — flanki polskie zamknęły się jak imadło. ' +
      'Wielki Mistrz Ulrich von Jungingen, który osobiście poprowadził ostatnią szarżę, zginął na polu bitwy — jego ciało odnaleziono wśród poległych. ' +
      'Grunwald na zawsze zmienił układ sił w Europie Środkowej i otworzył złoty wiek Rzeczypospolitej.',
    featured: true,
    scenes: [
      {
        id: 'grunwald_s1', perspective: 'narrator',
        title: 'Wojska zbierają się pod Grunwaldem',
        mood: 'tense', duration: 250,
        text:
          'Świt 15 lipca 1410 roku — na polach Prusów zbierają się wojska z kilkudziesięciu narodów i ziem. ' +
          'Po stronie polsko-litewskiej walczą husyci czescy, Tatarzy z Litwy, Rusini i zaciężni z Europy Zachodniej; po stronie Krzyżaków — elitarni rycerze z Rzeszy i goście zakonni z całej Europy. ' +
          'Jagiełło słucha mszy polowej pod dębem i nakazuje wojskom czekać — prowokuje Krzyżaków do pierwszego kroku. ' +
          'Von Jungingen, niecierpliwy, wysyła heroldów z mieczami — symbolem wyzwania. Król przyjmuje je spokojnie i wydaje rozkaz do formowania szyków. ' +
          'Na polach unosi się sierpniowy upał i kurz tysiąca kopyt.',
      },
      {
        id: 'grunwald_s2', perspective: 'side_b',
        title: 'Prowokacja Zakonu — dwa miecze',
        mood: 'strategic', duration: 210,
        text:
          'Von Jungingen wie, że czas gra na korzyść Jagiełły — im dłużej czeka, tym trudniej utrzymać dyscyplinę tak licznej armii krzyżackiej w letnim upale. ' +
          'Heroldowie Zakonu wkraczają przed szyki polskie z dwoma mieczami — obraźliwy gest, że Polacy są zbyt tchórzliwi, by stoczyć bitwę. ' +
          'Jagiełło przybiera pozę spokoju: z zimną krwią przyjmuje miecze i każe je zachować jako trofea. ' +
          'Krzyżacy ustawiają ciężką artylerię bombardową i czekają. W końcu puszczają salwę — pierwszą na tym polu. ' +
          'Bitwa największej rangi za trzysta lat — zaczyna się.',
      },
      {
        id: 'grunwald_s3', perspective: 'narrator',
        title: 'Odwrót Litwinów i kontruderzenie Polaków',
        mood: 'dramatic', duration: 260,
        text:
          'Lewe skrzydło litewskie pod Witoldem naciera pierwsze — i po zaciekłej walce zaczyna się cofać. ' +
          'Krzyżacy, przekonani o ucieczce, łamią własne szyki i ruszają w pościg — wprost w objęcia polskiego centrum. ' +
          'Chorągwie królewskie pod wodzą marszałka Zbigniewa z Brzezia trzymają linię jak mur; teraz uderzają z boku na rozczłonkowanych Krzyżaków. ' +
          'Wielka Chorągiew Krakowska — symbol Królestwa — pada i zostaje natychmiast odebrana, co wstrząsa Krzyżakami. ' +
          'Na polu trwa chaotyczna, bezlitosna sieczka: każdy walczy o własne życie i honor.',
      },
      {
        id: 'grunwald_s4', perspective: 'narrator',
        title: 'Śmierć Jungingena i koniec Zakonu',
        mood: 'melancholic', duration: 230,
        text:
          'Wielki Mistrz Ulrich von Jungingen nie zamierza opuścić pola. Gromadzi ostatnią rezerwę — szesnaście chorągwi — i osobiście prowadzi szarżę. ' +
          'Okrążony ze wszystkich stron, ginie w boju; jego ciało zostanie znalezione wśród setek poległych rycerzy Zakonu. ' +
          'Klęska jest totalna: na polu zostaje ponad dwunastu tysięcy zabitych Krzyżaków, wielu dostojników trafia do niewoli. ' +
          'Jagiełło nakazuje śpiewać Bogurodzicę nad polem bitwy — jeden z pierwszych zapisanych polskich hymnów wojennych. ' +
          'Zakon nigdy nie odzyska dawnej potęgi. Grunwald otwiera epokę polskiej hegemonii w Europie Środkowej.',
      },
    ],
  },

  {
    id: 'hastings-1066',
    name: 'Bitwa pod Hastings',
    subtitle: 'Koniec starej Anglii',
    era: 'medieval',
    year: 1066,
    date: '14 października 1066',
    location: { name: 'Battle, East Sussex, Anglia', lat: 50.9100, lng: 0.4870 },
    sides: ['Królestwo Anglii (Saksończycy)', 'Normandia Wilhelma Zdobywcy'],
    commanders: ['Król Harold II', 'Wilhelm Zdobywca (Wilhelm I)'],
    commanderA: 'Król Harold II',
    commanderB: 'Wilhelm Zdobywca',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bb/Bayeux_Tapestry_scene57_Harold_death.jpg/800px-Bayeux_Tapestry_scene57_Harold_death.jpg',
    summary: 'Normandzka kawaleria pokonała saksońską ścianę tarcz, otwierając nową epokę w historii Anglii i języka angielskiego.',
    outcome: 'Zwycięstwo Normandii — Wilhelm zostaje królem Anglii',
    description:
      'Gdy 5 stycznia 1066 roku umierał król Edward Wyznawca, o angielski tron starali się jednocześnie Harold, Wilhelm i Haraldr Hardraðe z Norwegii. ' +
      'Harold w ciągu jednego tygodnia pokonał Wikingów pod Stamford Bridge i przemaszerował czterysta kilometrów na południe. ' +
      'Pod Hastings zmęczona armia saksońska zajęła doskonałą pozycję na grzbiecie wzgórza Senlac — ale jeden złamany rozkaz przez impulsywną szarżę zmienił wszystko. ' +
      'Śmierć Harolda — prawdopodobnie trafionego strzałą w oko — pozbawiła obrońców wodza i woli walki. ' +
      'Koronacja Wilhelma 25 grudnia 1066 w Westminsterze zapoczątkowała transformację, która stworzyła nowoczesną Anglię.',
    scenes: [
      {
        id: 'hastings_s1', perspective: 'side_a',
        title: 'Ściana tarcz na wzgórzu Senlac',
        mood: 'strategic', duration: 240,
        text:
          'Czternastego października, tuż przed świtem, Harold ustawia siedem tysięcy huscarli i pospolite ruszenie na szczycie wzgórza Senlac. ' +
          'Shieldwall — ściana dębowych tarcz, ramię przy ramieniu — tworzy nieprzeniknioną linię wzdłuż całego grzbietu. ' +
          'Harold właśnie pokonał trzysta kilometrów z York po rozbiciu Wikingów Hardradego; jego ludzie są zmęczeni, ale dumni z podwójnego zwycięstwa. ' +
          'Na dole, w dolinie, Wilhelm Zdobywca ustawia łuczników, normandzką piechotę i ciężką konnicę — trzy uderzenia w jednym planie. ' +
          'Harold rozkazuje: trzymać linię, nie schodzić ze wzgórza, cokolwiek się stanie.',
      },
      {
        id: 'hastings_s2', perspective: 'side_b',
        title: 'Normandzkie szarże i fałszywy odwrót',
        mood: 'dramatic', duration: 230,
        text:
          'Łucznicy Wilhelma ostrzeliwują wzgórze przez godziny — strzały nie przebijają ściany tarcz, żołnierze w pierwszym rzędzie podnoszą tarcze i odgradzają je jak dach. ' +
          'Normandzka konnica szarżuje wielokrotnie i za każdym razem rozbija się o żelazny mur. Odwrót jest nieunikniony. ' +
          'Ale to właśnie Wilhelm nakazuje: fałszywy odwrót — normandczycy uciekają, wabiąc Sasów na równinę. ' +
          'Część saksońskich wojowników łamie rozkaz Harolda i schodzi ze wzgórza w pogoń za „uciekającymi" — to śmiertelny błąd. ' +
          'Normandzka konnica zawraca i masakruje rozczłonkowane oddziały na otwartym polu.',
      },
      {
        id: 'hastings_s3', perspective: 'narrator',
        title: 'Strzała Harolda',
        mood: 'melancholic', duration: 220,
        text:
          'W popołudniowym świetle Saksończycy kurczą się na szczycie wzgórza — coraz mniej ich, coraz więcej przerw w murze tarcz. ' +
          'Harold pada trafiony — czy strzałą w oko, jak pokazuje tkanina z Bayeux, czy ścięty mieczem kawalerzysty, tego historycy nie rozstrzygnęli do dziś. ' +
          'Bez króla ściana tarcz traci duszę — huscarle giną co do jednego broniąc ciała swego pana, odmawiając odwrotu lub kapitulacji. ' +
          'Kochanka Harolda, Edyta Łabędzioszyja, odnajdzie jego ciało po trzech dniach — tylko po bliznach i znakach ciała. ' +
          'Nikt nie zdecyduje się błagać Wilhelma o wydanie szczątków króla. Harold leży w poświęconej ziemi na klifach Hastings.',
      },
      {
        id: 'hastings_s4', perspective: 'narrator',
        title: 'Koniec saksońskiej Anglii',
        mood: 'melancholic', duration: 230,
        text:
          'Do zmierzchu bitwa dobiegła końca — tysiące poległych na obu stronach, ale wynik bezsporny: Anglia ma nowego pana. ' +
          'Wilhelm wkracza do Londynu i koronuje się 25 grudnia 1066 roku w Opactwie Westminsterskim, krzycząc ze strachu gdy zebrani na okrzyk aklamacji przestraszyli normandzką straż. ' +
          'Język angielski przez następne dwa wieki stanie się językiem klas niższych — dwór, kościół i prawo mówią po normandzku. ' +
          'Ziemie saksońskich możnowładców przejdą w ręce normandzkich baronów; za pięćdziesiąt lat w Anglii nie będzie ani jednego biskupa z angielskim imieniem. ' +
          'Ale krew saksońska przetrwa — i w ciągu wieków angielszczyzna wchłonie normandzki, tworząc język, którym dziś mówi pół świata.',
      },
    ],
  },

  {
    id: 'agincourt-1415',
    name: 'Bitwa pod Azincourt',
    subtitle: 'Szekspirowskie zwycięstwo łuczników',
    era: 'medieval',
    year: 1415,
    date: '25 października 1415',
    location: { name: 'Azincourt, Francja', lat: 50.4619, lng: 2.1370 },
    sides: ['Królestwo Anglii', 'Królestwo Francji'],
    commanders: ['Król Henryk V', 'Karol d\'Albret (Konstabl Francji)'],
    commanderA: 'Król Henryk V',
    commanderB: 'Karol d\'Albret',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/be/Schlacht_von_Azincourt.jpg/800px-Schlacht_von_Azincourt.jpg',
    summary: 'Angielcy i walijscy łucznicy longbow zniszczyli kwiat francuskiego rycerstwa brodzącego w błocie, mimo trzykrotnej przewagi liczebnej Francji.',
    outcome: 'Druzgocące zwycięstwo Anglii',
    description:
      'Azincourt to jedna z najsławniejszych bitew w historii — mała wyczerpana armia angielska, z dala od domu, pokonuje trzy razy liczniejszą Francję. ' +
      'Anglicy mieli 6 000 żołnierzy (w tym 5 000 łuczników longbow), Francuzi — od 12 000 do 36 000 (źródła podają różne liczby). ' +
      'Błoto po nocnym deszczu, wąski przesmyk lasu i niszcząca siła angielskich łuczników zniszczyły możliwości manewrowania ciężkiej kawalerii. ' +
      'Szekspir uwiecznił to zwycięstwo w „Henryku V", tworząc mowę do „The Few" — braci broni w dzień Świętego Kryspina. ' +
      'Azincourt stał się symbolem angielskiej determinacji i przewagi taktycznej nad liczebną przewagą.',
    scenes: [
      {
        id: 'agincourt_s1', perspective: 'narrator',
        title: 'Błoto Azincourt',
        mood: 'tense', duration: 240,
        text:
          'Świt 25 października 1415, dzień Świętych Kryspina i Kryspiniana. Przez całą noc lał deszcz i pole jest rozmiękłe, gliniaste. ' +
          'Angielska armia liczy zaledwie sześć tysięcy wyczerpanych żołnierzy po tygodniach marszów i braku zaopatrzenia. ' +
          'Naprzeciwko stoi elita francuskiego rycerstwa — dumni, bogaci, ozdobieni herbami, pewni triumfu nad wycieńczonym najeźdźcą. ' +
          'Henryk V objeżdża swoje oddziały, rozmawiając z każdym z żołnierzy z imienia — zapamiętywał ich twarze od początku kampanii. ' +
          'Angielczycy wbijają zaostrzone pale w ziemię przed swoją linią — prymitywna bariera, która zmieni bieg bitwy.',
      },
      {
        id: 'agincourt_s2', perspective: 'side_a',
        title: 'Deszcz strzał',
        mood: 'dramatic', duration: 255,
        text:
          'Henryk V wyrywa swój łuk i krzyczy „Nestroque!" — „Strzelać!" Pięć tysięcy walijskich i angielskich longbowów unosi się jednocześnie. ' +
          'Każdy łucznik może wystrzelić dziesięć do dwunastu strzał na minutę; w pierwszej minucie pięćdziesiąt tysięcy bełtów sypie się na postępujących Francuzów. ' +
          'Strzały z longbowa przebijają płytową zbroję z odległości stu metrów; końskie głowy i szyje, niezabezpieczone, giną pierwszymi salwami. ' +
          'Ciężko opancerzeni rycerze, brodząc w błocie po kolana, próbują dotrzeć do angielskiej linii — i padają jeden po drugim zanim dobiegną. ' +
          'Ci, którzy docierają do pali, wyczerpani, dostają ostrza noży przez szpary wizjery.',
      },
      {
        id: 'agincourt_s3', perspective: 'narrator',
        title: 'Rycerze w błocie',
        mood: 'brutal', duration: 260,
        text:
          'Pierwsza fala rycerzy topnie w błocie — zbroje ważą dwadzieścia pięć kilogramów i działają jak kotwice w rozmiękłym polu. ' +
          'Ranni, którzy padają, toni w brudnych wyrobiskach; nie mogą samodzielnie wstać ani wołać o pomoc. ' +
          'Angielskie serwilisy — lekko uzbrojeni parobcy i rzemieślnicy — wychodzą zza pali i wykańczają leżących nożami przez szczeliny w zbroi. ' +
          'Gdy docierają wieści o możliwym ataku na angielski obóz od tyłu, Henryk wydaje kontrowersyjny rozkaz: zabić jeńców. ' +
          'Setki schwytanych rycerzy, wartych kolosalne okupy, ginie z gardłem poderżniętym przez parobków — Europa będzie mówić o tym przez lata.',
      },
      {
        id: 'agincourt_s4', perspective: 'side_a',
        title: 'Dzień Świętego Kryspina',
        mood: 'heroic', duration: 210,
        text:
          'Wieczorem angielski obóz jest pełen śpiewu i dziękczynienia. Straty: od stu do czterystu Anglików i Walijczyków. ' +
          'Francuzi stracili od sześciu do dwunastu tysięcy, w tym Konstabla d\'Albret, trzech książąt krwi i setki najlepszych rycerzy królestwa. ' +
          'Henryk mówi do ocalałych: „Ten kto przelał ze mną krew, będzie moim bratem, choćby i dzisiaj był podłego stanu." ' +
          'Sto lat później Szekspir włoży w usta króla słowa: „We few, we happy few, we band of brothers." ' +
          'Traktat w Troyes za pięć lat uzna Henryka V dziedzicem tronu Francji — ale umrze on w 1422 roku, nie doczekawszy koronacji syna.',
      },
    ],
  },

  // ══════════════════════════════════════════════════════════
  // ERA: EARLY_MODERN (1500 – 1789)
  // ══════════════════════════════════════════════════════════
  {
    id: 'lepanto-1571',
    name: 'Bitwa pod Lepanto',
    subtitle: 'Koniec osmańskiej niepokonalności na morzu',
    era: 'early_modern',
    year: 1571,
    date: '7 października 1571',
    location: { name: 'Zatoka Patraska, Grecja', lat: 38.3714, lng: 21.8210 },
    sides: ['Liga Święta (Wenecja, Papiestwo, Hiszpania)', 'Imperium Osmańskie'],
    commanders: ['Don Juan Austriacki', 'Ali Pasza (Müezzinzade)'],
    commanderA: 'Don Juan Austriacki',
    commanderB: 'Ali Pasza',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Laureys_a_Castro_-_The_Battle_of_Lepanto.jpeg/800px-Laureys_a_Castro_-_The_Battle_of_Lepanto.jpeg',
    summary: 'Liga Święta rozbiła flotę osmańską, kończąc mit o niepokonalności Osmanów na Morzu Śródziemnym.',
    outcome: 'Zwycięstwo Ligi Świętej',
    description:
      'Przez czterdzieści lat flota osmańska dominowała na Morzu Śródziemnym, zagrażając każdemu wybrzeżu chrześcijańskiej Europy. ' +
      'Liga Święta, skuta z inicjatywy papieża Piusa V, zebrała 206 galer z Wenecji, Hiszpanii i Państwa Kościelnego. ' +
      'Kluczem do zwycięstwa były galeasy — wielkie okręty artyleryjskie, których Osmanie nie zdążyli ocenić zanim było za późno. ' +
      'Wśród rannych po stronie chrześcijańskiej walczył Miguel de Cervantes, przyszły autor Don Kichota, który do końca życia nazywał tę bitwę „najszlachetniejszą okazją jaką widziały wieki." ' +
      'Lepanto nie zakończyło potęgi osmańskiej na lądzie, ale psychologiczne pęknięcie mitu niepokonalności było trwałe.',
    scenes: [
      {
        id: 'lepanto_s1', perspective: 'narrator',
        title: 'Floty na Zatoce Patraskiej',
        mood: 'tense', duration: 240,
        text:
          'Siódmego października 1571, o świcie, dwie największe floty epoki ustawiają się naprzeciwko siebie na Zatoce Patraskiej. ' +
          'Liga Święta wystawiła 206 galer i sześć galeass — wielkich okrętów z sześćdziesięcioma działami każda; Osmanie — 251 galer i liczne galiony. ' +
          'Dwudziestoczteroletni Don Juan Austriacki, naturalny brat króla Filipa II Hiszpańskiego, stoi na dziobie flagowej galery i przemawia do marynarzy. ' +
          'Wśród nich młody żołnierz, Miguel de Cervantes z Madrytu, który gorączkuje od kilku dni, lecz odmawia zejścia do kabiny. ' +
          'Osmanie płyną wiarą w zwycięstwo — przez czterdzieści lat żadna chrześcijańska flota nie zdołała ich zatrzymać.',
      },
      {
        id: 'lepanto_s2', perspective: 'narrator',
        title: 'Galeasy otwierają bój',
        mood: 'dramatic', duration: 275,
        text:
          'Liga Święta stosuje sekretną broń: sześć galeass wysuwa się przed linię i otwiera zaporowy ogień nim dojdzie do abordażu. ' +
          'Każda galeas niesie pięćdziesiąt do sześćdziesięciu ciężkich dział — Osmanie nigdy czegoś takiego nie widzieli. ' +
          'Pierwsze salwy rozbijają szyki osmańskie i topiają galery admiralskie; janczarzy na pokładach są bezradni wobec artyleryjskiego piekła. ' +
          'Następuje abordaż: na pokładach toczy się walka wręcz, kordy i piki przeciw janczarskim szablom i krótkim łukom. ' +
          'Huk dział niesie się echem między wzgórzami Epiru; dym zasłania słońce i obie floty wzajemnie tracą widoczność.',
      },
      {
        id: 'lepanto_s3', perspective: 'narrator',
        title: 'Śmierć Ali Paszy',
        mood: 'brutal', duration: 200,
        text:
          'Ali Pasza walczy na pokładzie własnej galery flagowej Sultana, gdy trafia go kula muszkietu. ' +
          'Żołnierz wenecki odcina mu głowę i wbija na włócznię — widok pozbawionego głowy admirała przerywa opór osmańskich okrętów. ' +
          'Zielony sztandar proroka, który Ali Pasza przywiózł z Konstantynopola jako święty talizman zwycięstwa, trafia w ręce chrześcijańskich żołnierzy. ' +
          '„Allah opuścił nas!" — krzyczą janczarzy i rzucają broń lub skaczą za burtę. ' +
          'Galery osmańskie, jedna po drugiej, spuszczają osmańskie proporce.',
      },
      {
        id: 'lepanto_s4', perspective: 'narrator',
        title: 'Koniec mitu — nowe Morze Śródziemne',
        mood: 'triumphant', duration: 225,
        text:
          'Do zmierzchu Liga Święta zdobyła lub zatopiła 137 osmańskich okrętów i uwolniła dwanaście tysięcy chrześcijańskich galernków zakutych w łańcuchy. ' +
          'Osmanie stracili trzydzieści tysięcy zabitych; Liga — osiem tysięcy, w tym rannego Cervantesa ze strzaskaną lewą ręką. ' +
          'Sułtan Selim II odbuduje flotę w ciągu roku — logistyka osmańska jest niezrównana — ale psychologiczna niepokonalność Osmanów na morzu przepadła na zawsze. ' +
          'Cervantes do końca życia będzie mówił, że rana pod Lepanto była najpiękniejszą, jaką mógł otrzymać — dla chwały Boga i dobra chrześcijan. ' +
          'Morze Śródziemne przestaje być osmańskim jeziorem.',
      },
    ],
  },

  {
    id: 'rocroi-1643',
    name: 'Bitwa pod Rocroi',
    subtitle: 'Zmierzch niepokonanych tercji',
    era: 'early_modern',
    year: 1643,
    date: '19 maja 1643',
    location: { name: 'Rocroi, Francja (Ardeny)', lat: 49.9250, lng: 4.5220 },
    sides: ['Królestwo Francji', 'Habsburgowie Hiszpańscy — Tercje Flandryjskie'],
    commanders: ['Książę Condé (Wielki Condé)', 'Francisco de Melo'],
    commanderA: 'Ludwik II de Bourbon, Książę Condé',
    commanderB: 'Francisco de Melo',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Anonym_Entsatz_Wien_1683.jpg/800px-Anonym_Entsatz_Wien_1683.jpg',
    summary: 'Dwudziestojednoletni Condé okrążył i zniszczył legendarną tercję hiszpańską, kończąc sto lat dominacji Habsburgów na europejskich polach bitew.',
    outcome: 'Zwycięstwo Francji — koniec epoki tercji',
    description:
      'Tercje hiszpańskie przez sto lat były najskuteczniejszą formacją piechoty Europy — kwadratowe kolubryny pikinierów i muszkieterów zdobyły Italię, Niderlandy i Niemcy. ' +
      'Pod Rocroi zmierzyły się z nowym rodzajem wojskowości: szybką kawalerią i artyleria połączonymi przez genialną taktykę. ' +
      'Condé miał dwadzieścia jeden lat i dowodził po raz pierwszy — wygrał przez atak z flanki zamiast frontu. ' +
      'Stare tercje odmówiły kapitulacji i walczyły do ostatniego człowieka, wybierając śmierć z honorem. ' +
      'Rocroi otworzyło epokę militarnej dominacji Francji, która trwała przez całe panowanie Ludwika XIV.',
    scenes: [
      {
        id: 'rocroi_s1', perspective: 'narrator',
        title: 'Zmierzch tercji — sto lat chwały',
        mood: 'tense', duration: 235,
        text:
          'Dziewiętnastego maja 1643, cztery dni po śmierci kardynała Richelieu — Francja zmaga się z zewnętrznym atakiem Habsburg na kilku frontach. ' +
          'Pod Rocroi w Ardenach armia hiszpańska Francisco de Melo — 27 000 żołnierzy z najlepszymi tercjami Europy — zagraża samemu Paryżowi. ' +
          'Tercje, zrodziny w kampaniach włoskich Gonzalva de Córdoby, przez sto lat były niepokonane w otwartym polu — weterani wielu wojen, pewni własnej niezwyciężalności. ' +
          'Naprzeciwko stoi Ludwik II de Bourbon, Książę Condé — dwudziestojednoletni, dowodzący po raz pierwszy w życiu dwudziestotrzytysięczną armią. ' +
          'Wszyscy doradzają mu ostrożność. Condé słucha i robi swoje.',
      },
      {
        id: 'rocroi_s2', perspective: 'side_a',
        title: 'Kawaleria Condégo uderza z flanki',
        mood: 'dramatic', duration: 250,
        text:
          'Condé rozumie to, czego nie pojmują starsi generałowie: tercje są niemal niepokonalne frontem, lecz bezradne na flankach. ' +
          'Rzuca całą kawalerię prawego skrzydła na flankę hiszpańską, łamiąc konnicę Melo zanim zdąży zareagować. ' +
          'Objeżdżając pole za plecami tercji, zjawia się z tyłu i lewej strony jednocześnie — okrążenie kompletne, jak szkolne Kannas. ' +
          'Stare tercje nie uciekają — ustawiają się w zwarte kwadraty, ładują muszkiety i czekają. ' +
          'Przez godzinę odpierają szarże Condégo z czterech stron naraz, tracąc po trzystu ludzi za każdym razem.',
      },
      {
        id: 'rocroi_s3', perspective: 'side_b',
        title: 'Ostatnia salwa tercji',
        mood: 'melancholic', duration: 270,
        text:
          'Condé wysyła posłańca z ofertą honorowej kapitulacji — stary żołnierz, generał Fontaine, niesiony na noszach z powodu ran, odrzuca ją. ' +
          'Przez kolejną godzinę kurczące się kwadraty tercji odpierają szarżę za szarżą — weterani z Flandrii, Niemiec i Włoch, którzy przeżyli dziesiątki bitew. ' +
          'Kondé zatrzymuje masakrę na własny rozkaz, wstrząśnięty bohaterstwem wrogów, i po raz drugi oferuje kapitulację. ' +
          'Tym razem przyjętą — bo Fontaine już nie żyje. Z 27 000 Hiszpanów przeżyje 8 000; wśród poległych nikt nie uciekł. ' +
          'Condé, podobno, płacze nad poległymi wrogami.',
      },
      {
        id: 'rocroi_s4', perspective: 'narrator',
        title: 'Nowa epoka — Francja przejmuje pałeczkę',
        mood: 'strategic', duration: 220,
        text:
          'Rocroi zamknęło epokę — przez sto lat tercja była najskuteczniejszą formacją piechoty Europy. ' +
          'Pod Rocroi kawaleria w nowym połączeniu z artylerią i śmiałą taktyką okrążenia zakończyła jej dominację. ' +
          'Condé otrzyma przydomek „Wielki Condé" i przejdzie do historii jako jeden z najwybitniejszych dowódców Francji. ' +
          'Francja staje się mocarstwem militarnym — za pięćdziesiąt lat Ludwik XIV będzie dyktował warunki pokoju całej Europie. ' +
          'A Trzecia Armia Habsburgów? Odbuduje się w Niderlandach, ale tercje jako formacja nigdy nie wrócą.',
      },
    ],
  },

  // ══════════════════════════════════════════════════════════
  // ERA: NAPOLEON (1789 – 1815)
  // ══════════════════════════════════════════════════════════
  {
    id: 'waterloo-1815',
    name: 'Bitwa pod Waterloo',
    subtitle: 'Koniec epoki Napoleona',
    era: 'napoleon',
    year: 1815,
    date: '18 czerwca 1815',
    location: { name: 'Waterloo, Belgia', lat: 50.6800, lng: 4.4120 },
    sides: ['Koalicja (Wielka Brytania, Prusy, Niderlandy)', 'Cesarstwo Francuskie'],
    commanders: ['Wellington i Gebhard Leberecht von Blücher', 'Napoleon Bonaparte'],
    commanderA: 'Wellington i Blücher',
    commanderB: 'Napoleon Bonaparte',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/72/Battle_of_Waterloo_1815.PNG/800px-Battle_of_Waterloo_1815.PNG',
    summary: 'Ostateczna klęska Napoleona Bonaparte — połączone siły Wellingtona i Blüchera rozbiły Armię Cesarską, kończąc epokę napoleońską.',
    outcome: 'Zwycięstwo Koalicji — Napoleon abdykuje po raz drugi',
    description:
      'Waterloo to jedno z tych słów, które weszły do języka jako synonim ostatecznej klęski. ' +
      'Napoleon, wracający z Elby, miał plan: rozbić Prusy i Anglię oddzielnie zanim się połączą. Ligny było sukcesem — ale Quatre-Bras nie. ' +
      'Osiemnastego czerwca błoto po nocnym deszczu zmusiło Napoleona do opóźnienia ataku; te sześć godzin Blücher poświęcił na marsz na Waterloo. ' +
      'Ostatnia szarża Starej Gwardii i jej pierwszy w historii odwrót złamały morale całej armii. ' +
      'Do końca dnia dwie floty alianckie zamknęły pierścień — Napoleon rzuca się na łaskę kapitana angielskiego okrętu.',
    scenes: [
      {
        id: 'waterloo_s1', perspective: 'side_b',
        title: 'Błoto po deszczu — oczekiwanie',
        mood: 'strategic', duration: 240,
        text:
          'Siedemnastego czerwca całą noc padał deszcz — pola wokół Waterloo są rozmokłe, gliniaste, niemożliwe do przejścia dla artylerii. ' +
          'Napoleon czeka. Jego marszałkowie wiedzą, że Wellington, skopany pod Quatre-Bras, desperacko szuka Blüchera. ' +
          'Ale Blücher, choć pobity pod Ligny, nie wycofał się na wschód — wycofał się na północ. Ku Waterloo. ' +
          'Każda godzina opóźnienia to kilometry dla pruskich kolumn. Napoleon o tym nie wie, bo jego kawaleria nie ściga Prusaków. ' +
          'O 11:30 Napoleon wydaje wreszcie rozkaz do ataku — sześć godzin za późno.',
      },
      {
        id: 'waterloo_s2', perspective: 'narrator',
        title: 'Szarże Neya — morze koni bez wsparcia',
        mood: 'dramatic', duration: 255,
        text:
          'Marszałek Ney, „le Brave des Braves," prowadzi kawalerię w olbrzymie szarże na angielskie kwadraty — i za każdym razem rozbija się o ściany bagnetów. ' +
          'Angielska piechota formuje „square" — niezdobyty przez kawalerię kwadrat — i odpiera falę za falą pięćdziesięciu pułków kawalerii. ' +
          'Ney traci pięć koni pod sobą, wciąż atakuje — ale bez artylerii i piechoty jego szarże są krwawym teatrem. ' +
          'Wellington stoi na szczycie wzgórza i obserwuje przez lunetę. „Niech nadejdzie noc — albo Blücher" — mówi do adiutanta. ' +
          'Prusy nadchodzą. Od wschodu słychać grzmot armat.',
      },
      {
        id: 'waterloo_s3', perspective: 'narrator',
        title: 'Stara Gwardia idzie naprzód',
        mood: 'heroic', duration: 240,
        text:
          'O godzinie siódmej wieczorem Napoleon posyła Starą Gwardię — ostatni rezerwat, nigdy dotąd nie cofnięty. ' +
          'Gwardziści idą krokiem grenadierskim przez pole bitwy pod obstrzałem artylerii, w kolumnach, w milczeniu, z poczuciem własnej legendy. ' +
          'Wellington ukrywa część wojsk za grzbietem wzgórza — gdy Gwardia wchodzi, atakuje ją z obu boków Chasse i Maitland. ' +
          'Angielskie muszkiety i holenderska artyleria zdmuchują czoło kolumny. Gwardia zatrzymuje się. Po raz pierwszy w historii. ' +
          'Z angielskich linii wychodzi krzyk: „La Garde recule!" — Gwardia cofa się.',
      },
      {
        id: 'waterloo_s4', perspective: 'narrator',
        title: 'La Vieille Garde — koniec legendy',
        mood: 'melancholic', duration: 230,
        text:
          'Gdy wieść o odwrocie Gwardii roznosi się po polu, panika ogarnia całą armię francuską — to niemożliwe, niepojęte. ' +
          'Z obu stron nadciągają Prusacy Blüchera — Napoleon jest okrążony. Rozpad armii jest kompletny. ' +
          'Garść kadr Starej Gwardii tworzy kwadrat i umiera w nim do ostatniego, odmawiając poddania — generał Cambronne, według legendy, odpowiada na żądanie kapitulacji jednym słowem. ' +
          'Napoleon opuszcza pole bitwy karetą, potem konno — ucieka do Paryża, a stamtąd na angielski okręt. ' +
          'Wyspy Świętej Heleny. Koniec. Za sześć lat umrze w więzieniu, dyktując swoje pamiętniki dla historii.',
      },
    ],
  },

  {
    id: 'austerlitz-1805',
    name: 'Bitwa pod Austerlitz',
    subtitle: 'Słońce Austerlitz — szczyt geniuszu Napoleona',
    era: 'napoleon',
    year: 1805,
    date: '2 grudnia 1805',
    location: { name: 'Slavkov u Brna, Czechy (d. Austerlitz)', lat: 49.1524, lng: 16.8770 },
    sides: ['Cesarstwo Francuskie', 'Trzecia Koalicja (Austria, Rosja)'],
    commanders: ['Napoleon Bonaparte', 'Aleksander I i Franciszek II'],
    commanderA: 'Napoleon Bonaparte',
    commanderB: 'Aleksander I (car Rosji)',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/ba/La_bataille_d%27Austerlitz._2_decembre_1805_%28Fran%C3%A7ois_G%C3%A9rard%29.jpg/800px-La_bataille_d%27Austerlitz._2_decembre_1805_%28Fran%C3%A7ois_G%C3%A9rard%29.jpg',
    summary: 'Arcydzieło sztuki wojennej Napoleona — manewrem na centrum rozbił armię koalicji dwa razy liczniejszą, zmuszając Austrię do kapitulacji.',
    outcome: 'Druzgocące zwycięstwo Francji — koniec Trzeciej Koalicji',
    description:
      'Drugi grudnia 1805 roku, w rocznicę koronacji cesarskiej — Napoleon wybrał ten dzień celowo, by podkreślić symbolikę. ' +
      'Armia Cesarska liczyła 68 000 żołnierzy, koalicja rosyjsko-austriacka — 87 000. Napoleon miał jednak jeden wielki plan: wyciągnąć wroga z wzgórza Pratzen. ' +
      'Celowo osłabił własne prawe skrzydło, kuszą sojuszników do ataku; gdy rzucili się na „słabszy" punkt, centrum uderzyło i rozcięło ich armię na pół. ' +
      'Austerlitz zniszczył Trzecią Koalicję, zmusił Austrię do traktatu w Preszburgu i otworzył Napoleonowi drogę do dominacji nad Europą. ' +
      'Do dziś bitwa jest studiowana we wszystkich akademiach wojskowych świata jako wzorzec taktyczny.',
    featured: true,
    scenes: [
      {
        id: 'austerlitz_s1', perspective: 'side_a',
        title: 'Słońce Austerlitz — pułapka zastawiona',
        mood: 'strategic', duration: 250,
        text:
          'Pierwszego grudnia, noc przed bitwą, Napoleon odwiedza biwaki swoich żołnierzy — incognito, sam, bez świty. ' +
          'Żołnierze go rozpoznają i zapalają słomiane pochodnie — pole rozświetla się jak fajerwerki. Napoleon wraca do kwatery z mokrymi oczami. ' +
          'Rankiem przed bitwą tłumaczy marszałkom: „Pozwolimy im zaatakować nasze prawe skrzydło — im bardziej się tam skupią, tym łatwiej nam wziąć centrum." ' +
          'Aleksander I i jego sztab wpadają w pułapkę — widzą osłabione prawe skrzydło i sądzą, że Francuzi szykują odwrót. ' +
          'Jutro rano wszechświat zmieni właściciela.',
      },
      {
        id: 'austerlitz_s2', perspective: 'narrator',
        title: 'Mgła opada — atak na Pratzen',
        mood: 'dramatic', duration: 265,
        text:
          'O dziewiątej rano grudniowa mgła unosi się nagle — jakby teatralny efekt. Napoleon mówi do Soulta: „Jedną godzinę — i ta bitwa jest nasza." ' +
          'Soult i Vandamme rzucają dwie dywizje na wzgórze Pratzen — serce sojuszniczego ugrupowania. ' +
          'Rosyjskie i austriackie kolumny, zaangażowane atakiem na południe, nie zdążyły obsadzić wzgórza. Wchodzą na nie Francuzi. ' +
          'W ciągu czterdziestu minut Pratzen jest w rękach Cesarstwa — armia koalicji pęka na dwie odrębne, niemogące sobie pomagać części. ' +
          'Car Aleksander patrzy przez lunetę z oddali i nie rozumie, co widzi.',
      },
      {
        id: 'austerlitz_s3', perspective: 'side_a',
        title: 'Okrążenie lewego skrzydła',
        mood: 'triumphant', duration: 225,
        text:
          'Davout z południa i Soult z centrum zamykają lewe skrzydło koalicji jak stalowe kleszcze. ' +
          'Rosyjska Gwardia cesarska szarżuje na Pratzen — i pada pod skoordynowanym ogniem artylerii i muszkietów. ' +
          'Aleksander I ucieka z pola ze łzami w oczach; jego leibgwardia, kwiat rosyjskiej armii, leży martwa na wzgórzach. ' +
          'Panika ogarnia rosyjskie kolumny cofające się na zamarzniętą powierzchnię stawów Satschan i Mönitz. ' +
          'Berthier melduje Napoleonowi: „Sire, lewa flanka nieprzyjaciela nie istnieje."',
      },
      {
        id: 'austerlitz_s4', perspective: 'narrator',
        title: 'Lód stawów Satschan',
        mood: 'brutal', duration: 215,
        text:
          'Napoleon rozkazuje artylerzyście Marineaux celować w taflę zamarzniętych stawów, po których cofają się tysiące Rosjan z ciężkimi działami. ' +
          'Pod ciężarem armaty lód pęka — setki żołnierzy tonie w błotnistej, lodowatej wodzie; inne porzucają broń i uciekają na pieszo w mróz. ' +
          'Łączne straty koalicji: 36 000 zabitych, rannych i jeńców; Francja straciła 9 000. ' +
          'Traktat Preszburski, podpisany trzy tygodnie później, zmusza Austrię do ogromnych cesji terytorialnych i kontrybucji. ' +
          'Napoleon w Bulletin de la Grande Armée napisze: „Żołnierze — jestem z was zadowolony."',
      },
    ],
  },

  {
    id: 'borodino-1812',
    name: 'Bitwa pod Borodino',
    subtitle: 'Największa rzeź jednego dnia — bez zwycięzcy',
    era: 'napoleon',
    year: 1812,
    date: '7 września 1812',
    location: { name: 'Borodino, Rosja', lat: 55.5280, lng: 35.8180 },
    sides: ['Cesarstwo Francuskie i sojusznicy', 'Imperium Rosyjskie'],
    commanders: ['Napoleon Bonaparte', 'Michaił Kutuzow'],
    commanderA: 'Napoleon Bonaparte',
    commanderB: 'Michaił Kutuzow',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/43/Battle_of_Borodino.jpg/800px-Battle_of_Borodino.jpg',
    summary: 'Największa bitwa kampanii 1812 roku — 70 000 ofiar w jeden dzień, bez decydującego wyniku. Kutuzow cofnął się, lecz armia rosyjska przetrwała.',
    outcome: 'Nierozstrzygnięte — taktyczne zwycięstwo Francji, strategiczne Rosji',
    description:
      'Siódmego września 1812 roku, 200 kilometrów na zachód od Moskwy, dwie potęgi zmierzyły się w krwawej próbie sił. ' +
      'Napoleon miał 128 000 żołnierzy wycieńczonych marszem przez wyspalone ziemie; Kutuzow — 120 000 za umocnieniami i reduty. ' +
      'Przez cały dzień Francuzi zdobywali i tracili redutę centralną — Wielką Redutę — w walce wręcz bez precedensu. ' +
      'Napoleon nie posłał Starej Gwardii, gdy mógł — i ta decyzja uchroniła siłę uderzeniową, lecz nie przyniosła zwycięstwa. ' +
      'Kutuzow wycofał się, oddał Moskwę — i wygrał wojnę, bo Grande Armée nie miała dokąd pójść.',
    scenes: [
      {
        id: 'borodino_s1', perspective: 'narrator',
        title: 'Wielka Reduta — serce boju',
        mood: 'brutal', duration: 285,
        text:
          'Siódmego września świt nad Borodino jest mglisty i zimny — Napoleon jest chory, gorączkuje od dwóch dni. ' +
          'Celem frontalnego ataku jest Wielka Reduta — ziemne umocnienie z osiemnastoma działami, zwana przez żołnierzy „la grande batterie de la mort". ' +
          'Kolejne dywizje szturmują ją i giną: Caulaincourt, jeden z generałów, prowadzi szarżę kawaleryjską i pada martwy na wałach redouty. ' +
          'Jego brat widzi śmierć i prowadzi kolejną szarżę — i przeżywa. Reduta zmienia ręce siedmiokrotnie w ciągu jednego dnia. ' +
          'To nie jest genialny manewr — to rzeźnia na skalę, jakiej Europa jeszcze nie widziała.',
      },
      {
        id: 'borodino_s2', perspective: 'side_b',
        title: 'Śmierć Bagrationa',
        mood: 'melancholic', duration: 215,
        text:
          'Na lewym skrzydle stoi Piotr Bagration — uczeń Suworowa, bohater kilkudziesięciu kampanii, ulubieniec armii rosyjskiej. ' +
          'Osmukłowce — polowe umocnienia lewego skrzydła — są atakolowane falą za falą przez korpus Davouta i Neya. ' +
          'Bagration, organizując kontratak, trafiony zostaje odłamkiem granatu w nogę. Oficerowie próbują wynieść go z pola — odmawia. „Gdzie mój koń?" ' +
          'Przenoszony siłą, umrze trzy tygodnie później od zakażenia rany. Cała armia rosyjska nosi żałobę. ' +
          'Nawet Napoleon, słysząc o śmierci Bagrationa, zapisze w swoich dziennikach: „straciliśmy dobrego generała."',
      },
      {
        id: 'borodino_s3', perspective: 'side_a',
        title: 'Napoleon nie wysyła Gwardii',
        mood: 'strategic', duration: 255,
        text:
          'Godzina piętnasta — Wielka Reduta zdobyta, Rosjanie cofają się na nowych pozycjach. Marszałkowie otaczają Napoleona. ' +
          'Murat klęka: „Sire — wyślij Gwardię! Jeden uderzenie i Kutuzow jest skończony." Ney wtóruje. Berthier milczy, ale jego twarz błaga. ' +
          'Napoleon patrzy na pole przez lunetę długą chwilę. „Zbyt daleko od Francji, by ryzykować ostatnią rezerwę." ' +
          'Gwardia stoi. Kutuzow odchodzi z armią — zdezorganizowaną, ale nierozbitą. Moskwa zostanie oddana, ale armia przeżyje. ' +
          'Ta decyzja przejdzie do historii jako jeden z największych strategicznych błędów Napoleona.',
      },
      {
        id: 'borodino_s4', perspective: 'narrator',
        title: 'Pyrrusowe pole — Moskwa za nic',
        mood: 'melancholic', duration: 245,
        text:
          'Wieczór 7 września: na polu o powierzchni kilku kilometrów leży siedemdziesiąt tysięcy zabitych i rannych z obu stron. ' +
          'Napoleon zdobędzie Moskwę tydzień później — i znajdzie ją pustą, płonącą, pozbawioną zaopatrzenia i ludności. ' +
          'Przez miesiąc czeka na rosyjskie poselstwo z prośbą o pokój. Nie przychodzi. Kutuzow odtwarza armię za Moskwą. ' +
          'W połowie października Napoleon zarządza odwrót — przez wyspaloną ziemię, w nadchodzący mróz, bez zaopatrzenia. ' +
          'Z 600 000 żołnierzy Wielkiej Armii, którzy przekroczyli Niemen w czerwcu, przez Berezynę przejdzie niespełna 100 000.',
      },
    ],
  },

  // ══════════════════════════════════════════════════════════
  // ERA: WW1 (1914 – 1918)
  // ══════════════════════════════════════════════════════════
  {
    id: 'ypres-1914',
    name: 'Pierwsza Bitwa pod Ypres',
    subtitle: 'BEF broni ostatniego skrawka Belgii',
    era: 'ww1',
    year: 1914,
    date: 'Październik–Listopad 1914',
    location: { name: 'Ypres, Belgia', lat: 50.8503, lng: 2.8787 },
    sides: ['Ententa (Wielka Brytania, Francja, Belgia)', 'Cesarstwo Niemieckie'],
    commanders: ['Sir John French', 'Erich von Falkenhayn'],
    commanderA: 'Sir John French',
    commanderB: 'Erich von Falkenhayn',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Into_the_Jaws_of_Death_23-0455M_edit.jpg/800px-Into_the_Jaws_of_Death_23-0455M_edit.jpg',
    summary: 'Brytyjski korpus ekspedycyjny (BEF) obronił Ypres przed niemieckim natarciem, ratując port Calais i utrzymując kontakt z morzem.',
    outcome: 'Alianckie utrzymanie Ypres — stabilizacja frontu zachodniego',
    description:
      'Pierwsza Bitwa pod Ypres zamknęła manewrową fazę Wielkiej Wojny i otworzyła cztery lata okopów. ' +
      'Niemcy próbowali zdobyć Ypres, by odciąć alianckie zaopatrzenie przez Kanał La Manche. ' +
      'BEF, liczący zaledwie 70 000 żołnierzy, bronił frontowych pozycji przed 200 000 atakujących przez sześć tygodni. ' +
      'Straty były straszne — regularna brytyjska armia zawodowców praktycznie przestała istnieć; ocalałych zastąpią ochotnicy Kitchenera. ' +
      'Menin Gate — jedna z bram wejściowych do Ypres — stała się symbolem poległych; wyryte są na niej imiona 54 000 żołnierzy bez znanych grobów.',
    scenes: [
      {
        id: 'ypres14_s1', perspective: 'narrator',
        title: 'Wyścig do morza — Ypres jako klucz',
        mood: 'tense', duration: 245,
        text:
          'Październik 1914: po Marnie obie armie gorączkowo próbują obejść skrzydła przeciwnika w kierunku morza — „wyścig do morza". ' +
          'Ypres, prastaره flamandzkie miasto, kontroluje drogi do portów Calais i Dunkierki — strategiczne linie zaopatrzenia dla Ententy. ' +
          'Sir John French rozkazuje trzymać Ypres za wszelką cenę — BEF jest zaledwie 70 000 żołnierzy wobec 200 000 Niemców. ' +
          'Falkenhayn wierzy, że jeden zdecydowany atak przełamie linię aliancką — wysyła trzy armie na wąski odcinek frontu. ' +
          'Alianci nie wiedzą jeszcze, że ten skrawek Belgii będzie kosztował milion ofiar przez cztery lata.',
      },
      {
        id: 'ypres14_s2', perspective: 'side_a',
        title: 'BEF trzyma linię',
        mood: 'heroic', duration: 230,
        text:
          'Brytyjscy regularyści — zawodowi żołnierze, weterani kolonialnych wojen — strzelają z takiej dokładności, że Niemcy sądzą, iż napotykają karabiny maszynowe. ' +
          'Każdy żołnierz angielski potrafi oddać piętnaście celnych strzałów na minutę ze Standardowego Lee-Enfielda. ' +
          'Przy Gheluvelt, kiedy pozycja jest niemal przełamana, dwa bataliony szkockie kontratakiem przywracają linię. ' +
          'Dowódcy ginący za dowódcami — w ciągu miesiąca BEF straci niemal wszystkich oficerów zawodowych. ' +
          'Zastępują ich podoficerowie, ochotnicy i rezerwiści — tacy sami będą walczyli pod Verdun i Sommą.',
      },
      {
        id: 'ypres14_s3', perspective: 'narrator',
        title: 'Kindergarten idzie do szturmu',
        mood: 'brutal', duration: 255,
        text:
          'Falkenhayn, zdesperowany, wysyła nowe dywizje złożone z niedawno wcielonych studentów i ochotników — „Kindermord von Ypern", dzieciobójstwo pod Ypres. ' +
          'Tysiące młodych Niemców idą w szyku bojowym przez otwarte pole śpiewając „Deutschland über alles" — i giną pod ogniem karabinów. ' +
          'Niemcy stracą 25 000 tylko w atakach 10–11 listopada na Nonne Boschen i Polygon Wood. ' +
          'BEF trzyma — ale cena jest straszna: z sześćdziesięciu tysięcy żołnierzy regularnej brytyjskiej armii ocaleje zaledwie kilka tysięcy zdolnych do walki. ' +
          'Anglia będzie musiała zbudować armię od nowa, i zrobi to — przez miliony ochotników.',
      },
      {
        id: 'ypres14_s4', perspective: 'narrator',
        title: 'Ypres trwa — i będzie trwać',
        mood: 'melancholic', duration: 235,
        text:
          'Połowie listopada 1914 front stabilizuje się — Ypres jest aliancki, ale otoczony z trzech stron. ' +
          'Przez cztery lata miasto będzie regularnie bombardowane; do 1918 roku nie pozostanie z niego dosłownie nic prócz gruzów. ' +
          'Menin Gate, zbudowana w 1927 roku, nosi imiona 54 000 żołnierzy Wspólnoty Narodów bez znanych grobów z okolic Ypres. ' +
          'Każdego wieczoru od 1928 roku, z wyjątkiem lat 1940–1944 (gdy miasto było pod okupacją), o ósmej grani tam Last Post. ' +
          'Grani do dziś — i będzie grał, dopóki pamięć trwa.',
      },
    ],
  },

  {
    id: 'marne-1914',
    name: 'Bitwa nad Marną',
    subtitle: 'Cud, który ocalił Paryż',
    era: 'ww1',
    year: 1914,
    date: '5–12 września 1914',
    location: { name: 'Rzeka Marna, Francja', lat: 48.9742, lng: 3.7000 },
    sides: ['Ententa (Francja, Wielka Brytania)', 'Cesarstwo Niemiec'],
    commanders: ['Joffre, French, Gallieni', 'Von Kluck, Von Bülow'],
    commanderA: 'Joseph Joffre i Gallieni',
    commanderB: 'Alexander von Kluck',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ae/The_Battle_of_Stalingrad_second_collage.jpg/800px-The_Battle_of_Stalingrad_second_collage.jpg',
    summary: 'Kontrofensywa aliancka zatrzymała nacierające Niemcy i zmusiła je do odwrotu za rzekę Aisne — kończąc plany szybkiej wojny i otwierając erę okopów.',
    outcome: 'Zwycięstwo aliantów — Niemcy cofają się za Aisne',
    description:
      'Wrzesień 1914 — Plan Schlieffena właśnie się sypał. Niemcy, maszerując przez Belgię, mieli okrążyć Paryż od zachodu i zniszczyć Francję w sześć tygodni. ' +
      'Von Kluck, naciskany od wschodu, zboczył za wcześnie — odsłaniając prawą flankę między swoją armią a Von Bülow. ' +
      'Gallieni, gubernator wojskowy Paryża, zauważył lukę i zorganizował kontruderzenie — w tym legendarny przerzut rezerwistów paryskimi taksówkami. ' +
      'Przez siedem dni 5–12 września 2 miliony żołnierzy walczyły na 200-kilometrowym froncie wzdłuż Marny. ' +
      'Niemcy cofnęli się — i ta decyzja na zawsze zmieniła charakter Wielkiej Wojny: z manewrowej w okopową.',
    scenes: [
      {
        id: 'marne_s1', perspective: 'narrator',
        title: 'Taksówki Paryża — improwizacja Galleniego',
        mood: 'heroic', duration: 215,
        text:
          'Szósty września 1914, godzina druga w nocy — generał Gallieni wydaje historyczny rozkaz: rekwirować wszystkie paryskie taksówki. ' +
          'W ciągu jednej nocy sześćset samochodów Renault AG zatrzymują się na ulicach Paryża; kierowcy dowiadują się, że jadą na front. ' +
          'W pięciu kursach przewożą sześć tysięcy rezerwistów VII Korpusu na pozycje nad Marną. ' +
          'Każdy kierowca dostaje kwit rządowy z obietnicą zwrotu: kasety taksometrów zapisują trasę. ' +
          'Żołnierze przybywają świezi, podczas gdy Niemcy są wyczerpani tygodniami marszów — to ma znaczenie.',
      },
      {
        id: 'marne_s2', perspective: 'side_a',
        title: 'Luka między armiami',
        mood: 'strategic', duration: 250,
        text:
          'Oficer wywiadu lotniczego zauważył z samolotu kolumny Von Klucka skręcające nie na zachód od Paryża, lecz na wschód — w lukę między Bülow. ' +
          'Joffre rozumie: jest trzydziestokilometrowa dziura w linii niemieckiej, nieosłonięta przez nikogo. ' +
          'BEF i Franchet d\'Espèrey wchodzą w tę lukę — powoli, ostrożnie, ale wchodzą. Von Bülow widzi zagrożenie i zarządza odwrót. ' +
          'Von Kluck, odcięty bez flanki, musi cofnąć się za Aisne. Inne armie idą za nim. ' +
          'Siedem lat planowania Schlieffena upada w ciągu tygodnia.',
      },
      {
        id: 'marne_s3', perspective: 'narrator',
        title: 'Bitwa na dwustu kilometrach frontu',
        mood: 'tense', duration: 230,
        text:
          'Od piątego do dwunastego września dwa miliony żołnierzy walczą wzdłuż Marny na froncie 200 kilometrów. ' +
          'Każda wioska, każdy most, każde wzgórze zmienia rąk po kilka razy. Żołnierze są na skraju wytrzymałości po tygodniach nieustannych marszów i walk. ' +
          'Falkenhayn widzi, że Plan Schlieffena nie żyje — że błyskawiczna kampania jest niemożliwa. ' +
          'Ale nie potrafi jeszcze przyznać, że Niemcy przegrały bitwę o Francję w pierwszym miesiącu. ' +
          'Czekają ich cztery lata, żeby się o tym ostatecznie przekonać.',
      },
      {
        id: 'marne_s4', perspective: 'narrator',
        title: 'Cud nad Marną — i jego cena',
        mood: 'triumphant', duration: 225,
        text:
          'Dwunastego września Niemcy cofają się za Aisne i zaczynają kopać okopy — pierwsze z miliardów metrów okopów, które pokryją Belgię i Francję. ' +
          'Marna ocalała Francję. Niemcy nie zdobędą Paryża — nie w 1914, nie nigdy więcej. ' +
          'Cena tego „cudu": od 500 000 do 800 000 zabitych i rannych po obu stronach w ciągu jednego tygodnia. ' +
          'Gallieni dożyje 1916 roku — zdąży zostać ogłoszony Bohaterem Francji przed śmiercią na gruźlicę. ' +
          'A taksówkarze? Każdy dostał swoje pieniądze za kurs. I medale.',
      },
    ],
  },

  {
    id: 'verdun-1916',
    name: 'Bitwa pod Verdun',
    subtitle: 'Ils ne passeront pas',
    era: 'ww1',
    year: 1916,
    date: 'Luty–Grudzień 1916',
    location: { name: 'Verdun-sur-Meuse, Francja', lat: 49.1605, lng: 5.3875 },
    sides: ['Francja', 'Cesarstwo Niemiec'],
    commanders: ['Philippe Pétain, Robert Nivelle', 'Erich von Falkenhayn, Kronprinz Wilhelm'],
    commanderA: 'Philippe Pétain',
    commanderB: 'Erich von Falkenhayn',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Battle_of_Verdun_map.png/800px-Battle_of_Verdun_map.png',
    summary: 'Dziesięć miesięcy piekła pod Verdun — Francja obroniła symbol narodowy kosztem 550 000 ofiar; Niemcy stracili 434 000 nie osiągając żadnego celu.',
    outcome: 'Francja utrzymała Verdun — pyrrusowe zwycięstwo moralne',
    description:
      'Falkenhayn zaplanował Verdun jako maszynę do „wykrwawiania Francji do ostatniego żołnierza" — atakując cel tak symboliczny, że Francja nie może go oddać. ' +
      'Atak zaczął się 21 lutego 1916 — 1 400 dział otwierało ogień przez dziesięć godzin na 15-kilometrowym odcinku frontu. ' +
      'Pétain zorganizował genialny system rotacji wojsk przez Voie Sacrée (Świętą Drogę) — jedyną trasę zaopatrzenia. ' +
      'Bitwa trwała dziesięć miesięcy; przez ten czas trzy czwarte całej armii francuskiej przeszło przez „maszynę do mięsa" Verdun. ' +
      'Teren wokół Verdun jest do dziś „strefą śmierci" — tak przesiąknięty metalem i toksycznymi substancjami, że nie wolno tam budować ani orać.',
    featured: true,
    scenes: [
      {
        id: 'verdun_s1', perspective: 'narrator',
        title: 'Fort Douaumont pada',
        mood: 'dramatic', duration: 265,
        text:
          'Dwudziestego pierwszego lutego 1916 roku, o godzinie siódmej rano, 1 400 armat otwiera ogień wzdłuż 15-kilometrowego frontu. ' +
          'Jest to największy ostrzał artyleryjski w historii do tej chwili — ziemia dosłownie drżała 50 kilometrów dalej. ' +
          'Fort Douaumont, klejnot fortyfikacji Verdun, zdobyto trzeciego dnia przez dziewięciu żołnierzy niemieckich — forteca była prawie pusta, rząd w Paryżu wywiózł załogę. ' +
          'Wiadomość trafiła do Paryża jak cios w szczękę — Douaumont był symbolem, a teraz jest w rękach wroga. ' +
          'Falkenhayn uśmiecha się: pułapka zadziałała — Francja musi teraz walczyć o każdy centymetr tego przeklętego miejsca.',
      },
      {
        id: 'verdun_s2', perspective: 'side_a',
        title: 'Voie Sacrée — droga życia',
        mood: 'heroic', duration: 235,
        text:
          'Pétain obejmuje dowodzenie i rozumie: Verdun musi trwać nie ze względów militarnych, ale psychologicznych — oddanie go złamie Francję. ' +
          'Organizuje rewolucyjny system rotacji: żaden oddział nie spędzi przy Verdun więcej niż piętnaście dni. ' +
          'Jedyna droga dowozu — Route 1944, przemianowana na Voie Sacrée — obsługuje ciężarówkę co czternaście sekund, dzień i noc, siedem dni w tygodniu. ' +
          'Sześć tysięcy ton zaopatrzenia dziennie; 250 000 robotników naprawia drogę bez przerwy, bo grzęzawi spod kół pochłania kamienie. ' +
          'Verdun dostaje wszystko. Verdun trwa.',
      },
      {
        id: 'verdun_s3', perspective: 'narrator',
        title: 'Piekło kotłowni — dziesięć miesięcy',
        mood: 'brutal', duration: 305,
        text:
          'Miesiące zamieniają się w jeden ciągły koszmar — Fort Douaumont zmienia rąk czternaście razy, każde przejęcie kosztuje tysiące żyć. ' +
          'Nowe bronie: gaz musztardowy i gaz fosgen palą płuca od środka; miotacze ognia zamieniają forty w piece. ' +
          'Żołnierze tracą poczucie czasu, kierunku, sensu — jeden z ocalałych zapisał: „Przestałem być człowiekiem. Stałem się czymś, co się czołga." ' +
          'Eksplozje bliskich granatów powodują urazy mózgu bez zewnętrznych śladów rany — żołnierze padają nagle w ciszy. ' +
          'Do końca roku przez Verdun przejdą 3 miliony żołnierzy; 700 000 z nich nie wróci.',
      },
      {
        id: 'verdun_s4', perspective: 'side_a',
        title: 'Ils ne passeront pas — i nie przeszli',
        mood: 'heroic', duration: 245,
        text:
          'Okrzyk obrońców: „Ils ne passeront pas" — nie przejdą. I nie przeszli. Pétain trzymał słowo. ' +
          'W październiku generał Mangin organizuje kontrofensywę — żołnierze wchodzą z bagnetami do Douaumont i odbijają fort pomieszczenie po pomieszczeniu. ' +
          'Falkenhayn zostaje odwołany przez Hitlera — cesarz straci do niego zaufanie po niepowodzeniu planu wykrwawienia Francji. ' +
          'Verdun trwa — i trwać będzie do 11 listopada 1918. Żadne strategiczne terytorium nie zmieni rąk. ' +
          'Ale milion ludzi jest martwych, a Francja stanie się na wieki narodem, który wie, co znaczy słowo „koszt".',
      },
      {
        id: 'verdun_s5', perspective: 'narrator',
        title: 'Strefa Śmierci — rana, która nie zagoi się nigdy',
        mood: 'melancholic', duration: 205,
        text:
          'Do listopada 1916 roku Francja utrzymała Verdun — żadnych wymiernych korzyści militarnych, żadnych zdobytych terytoriów. ' +
          'Francja straciła 550 000 zabitych i rannych; Niemcy — 434 000. Niemal milion ofiar bez sensownego wyniku. ' +
          'Verdun zniszczyło pokolenie oficerów obu armii — ci, którzy przeżyli, będą dowodzić w następnej wojnie ze złamaną wiarą w sens walki. ' +
          'Tereny wokół Verdun są do dziś „Zone Rouge" — Strefą Czerwoną. Ziemia tak przesiąknięta metalem, wybuchowymi substancjami i szczątkami ludzkimi, że nie wolno tam budować, orać ani mieszkać. ' +
          'Mówi się, że w ziemi leżą jeszcze szczątki 130 000 żołnierzy — nieodnalezionych, niezidentyfikowanych.',
      },
    ],
  },

  // ══════════════════════════════════════════════════════════
  // ERA: WW2 (1939 – 1945)
  // ══════════════════════════════════════════════════════════
  {
    id: 'britain-1940',
    name: 'Bitwa o Anglię',
    subtitle: 'The Few — zwycięstwo pilotów',
    era: 'ww2',
    year: 1940,
    date: 'Lipiec–Październik 1940',
    location: { name: 'Anglia — niebo nad Kentem i Londynem', lat: 51.2760, lng: 0.5200 },
    sides: ['Wielka Brytania — RAF i Obrona Terytorialna', 'Luftwaffe Rzeszy Niemieckiej'],
    commanders: ['Air Marshal Hugh Dowding', 'Reichsmarschall Hermann Göring'],
    commanderA: 'Air Marshal Hugh Dowding',
    commanderB: 'Hermann Göring',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/Raising_a_flag_over_the_Reichstag_-_Restoration.jpg/800px-Raising_a_flag_over_the_Reichstag_-_Restoration.jpg',
    summary: 'Pierwsza bitwa w historii rozstrzygnięta wyłącznie w powietrzu — RAF pokonał Luftwaffe, ratując Anglię przed inwazją.',
    outcome: 'Zwycięstwo Wielkiej Brytanii — Plan Seelöwe odwołany',
    description:
      'Lato 1940 roku — Niemcy kontrolują Europę od Atlantyku po Bug. Anglia stoi sama, po ewakuacji z Dunkierki. ' +
      'Plan Seelöwe — Lew Morski, lądowa inwazja na Wyspy — wymaga najpierw zniszczenia Royal Air Force. ' +
      'Göring obiecał Hitlerowi, że Luftwaffe skończy z RAF w cztery tygodnie; trwało to cztery miesiące i skończyło się klęską Niemiec. ' +
      'Kluczem było radar — sieć stacji Chain Home i centralne systemy koordynacji pozwoliły przewidzieć każdy atak. ' +
      'Wśród pilotów The Few walczyli Polacy z 303 Dywizjonu, którzy stali się najskuteczniejszą jednostką RAF.',
    featured: true,
    scenes: [
      {
        id: 'britain_s1', perspective: 'side_a',
        title: 'Radar kontra Luftwaffe — niewidzialna broń',
        mood: 'strategic', duration: 250,
        text:
          'Dowding rozumiał, że Anglii nie uratuje odwaga pilotów, lecz system. ' +
          'Sieć radarów Chain Home — 51 stacji wzdłuż wybrzeża — wykrywała nadlatujące formacje Luftwaffe z odległości 150 kilometrów. ' +
          'Centralne Centrum Operacji w Bentley Priory przetwarzało dane i kierowało skwadronami z ziemi przez radio. ' +
          'Piloci nie musieli latać na ślepo — startowali tylko wtedy, gdy wróg był już zidentyfikowany i namierzony. ' +
          'Göring nie wiedział o tej sieci — ani o tym, że każda jego decyzja jest już odczytana i kontrowana.',
      },
      {
        id: 'britain_s2', perspective: 'side_a',
        title: 'The Few — i Polacy Dywizjonu 303',
        mood: 'heroic', duration: 240,
        text:
          'Churchill przemawia 20 sierpnia: „Nigdy w dziejach ludzkich konfliktów tak wielu nie zawdzięczało tak wiele tak niewielu." ' +
          'Piloci RAF latają po trzy, cztery, pięć lotów dziennie — każdego dnia na granicy wytrzymałości fizycznej i psychicznej. ' +
          'Wśród nich 145 Polaków — pilotów, którzy uciekli przez Rumunię i Francję. 303 Dywizjon, złożony z Polaków, zostaje najskuteczniejszą jednostką Bitwy o Anglię — 126 zestrzelonych Niemców. ' +
          'Polacy latają z zimną furią — dla nich to nie jest obrona obcego kraju, to zemsta za Polskę. ' +
          'Kiedy jeden z nich pyta dowódcę o urlop, tamten odpowiada: „Po wojnie."',
      },
      {
        id: 'britain_s3', perspective: 'narrator',
        title: 'Blitz — noce terroru',
        mood: 'brutal', duration: 265,
        text:
          'Siódmego września 1940 Hitler popełnia błąd, który ocali Anglię: zamiast lotnisk rozkazuje bombardować Londyn — odwet za angielski nalot na Berlin. ' +
          'Pięćdziesiąt siedem nocy z rzędu Londyn jest bombardowany — Battersea, East End, doki, szpitale. ' +
          'Tysiące cywilów ginie w schronach lub pod gruzami; metropolitalne metro staje się sypialnią dla miliona mieszkańców. ' +
          'Ale lotniska RAF odbudowują się; radary działają; myśliwce startują każdego ranka. ' +
          'Churchill, wizytując zburzone dzielnice, słyszy okrzyki „Good old Winnie!" — i łka, odwrócony tyłem do tłumu, żeby nie widzieli łez.',
      },
      {
        id: 'britain_s4', perspective: 'narrator',
        title: 'Błąd Göring — zmiana taktyki',
        mood: 'strategic', duration: 225,
        text:
          'Göring, koncentrując się na Londynie, nie rozumie że niszczy własną taktykę. ' +
          'Każdy Heinkel nad Londynem to Heinkel, który nie bombarduje lotniska w Biggin Hill czy radaru w Ventnor. ' +
          'Luftwaffe traci w Bitwie o Anglię 1733 samoloty — więcej niż produkują fabryki Rzeszy w tym czasie. ' +
          'Pilotów nie można zastąpić tak łatwo jak maszyny — każdy zestrzelony ess jest bezpowrotną stratą. ' +
          'Siedemnastego września 1940 Hitler podpisuje dyrektywę: Seelöwe odłożone bezterminowo. Anglia przetrwała.',
      },
      {
        id: 'britain_s5', perspective: 'narrator',
        title: 'Pierwsza klęska Hitlera',
        mood: 'triumphant', duration: 215,
        text:
          'Bitwa o Anglię to pierwsza wielka klęska strategiczna Hitlera — i pierwsza bitwa w historii rozstrzygnięta wyłącznie przez siły powietrzne. ' +
          'Wykazała też, że Niemcy, choć groźne, można pokonać — w umiejętnym środowisku, z dobrym systemem dowodzenia i determinacją. ' +
          'Anglia stała się przyczółkiem, z którego za cztery lata wystartuje inwazja normandzka. ' +
          'Dowding zostanie „nagrodzony" odwołaniem ze stanowiska przez zazdrosnych generałów — Anglicy dopiero po wojnie docenią jego genialny system. ' +
          'Piloci 303 Dywizjonu wrócą do wolnej Polski — ale nie tej, o którą walczyli.',
      },
    ],
  },

  {
    id: 'stalingrad-1942',
    name: 'Bitwa o Stalingrad',
    subtitle: 'Punkt zwrotny — złamany kręgosłup Rzeszy',
    era: 'ww2',
    year: 1942,
    date: 'Sierpień 1942 – Luty 1943',
    location: { name: 'Stalingrad (Wołgograd), Rosja', lat: 48.7070, lng: 44.5170 },
    sides: ['Związek Radziecki (Armia Czerwona)', 'Niemcy — 6. Armia i sojusznicy'],
    commanders: ['Wasilij Czujkow, Gieorgij Żukow', 'Friedrich Paulus'],
    commanderA: 'Gieorgij Żukow i Wasilij Czujkow',
    commanderB: 'Friedrich Paulus',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ae/The_Battle_of_Stalingrad_second_collage.jpg/800px-The_Battle_of_Stalingrad_second_collage.jpg',
    summary: 'Okrążenie i zniszczenie 6. Armii Paulusa — punkt zwrotny II Wojny Światowej. 300 000 żołnierzy okrążonych, 5 000 wróciło.',
    outcome: 'Druzgocące zwycięstwo ZSRR — 6. Armia niszczyła',
    description:
      'Stalingrad nosił imię Stalina — Niemcy chcieli je zdobyć jako symbol; Rosjanie nie mogli go oddać z tego samego powodu. ' +
      'Czujkow stosował taktykę „trzymaj blisko" — walka toczyła się o każde piętro, każdy pokój, każdy metr kanalizacji. ' +
      'Żukow i Wasilewski zaplanowali w tajemnicy Operację Uran — okrążenie przez słabe flanki rumuńskie. ' +
      'Pierścień zamknął się 23 listopada 1942; 330 000 żołnierzy Paulusa znalazło się w kotle zimowym bez zaopatrzenia. ' +
      'Drugi lutego 1943, Paulus podpisuje kapitulację — z 330 000 okrążonych do domu wróci mniej niż 6 000.',
    featured: true,
    scenes: [
      {
        id: 'stalingrad_s1', perspective: 'narrator',
        title: 'Rattenkrieg — szczurza wojna',
        mood: 'brutal', duration: 290,
        text:
          'Sierpień 1942 — 6. Armia Paulusa wdziera się do Stalingradu z trzech stron. Myśleli, że zajmą miasto w tydzień. ' +
          'Czujkow zarządza „Rattenkrieg" — szczurzą wojnę: walcz o każdy metr, każde piętro, każdą ścianę. Artyleria niemiecka jest bezużyteczna gdy wróg jest o pięć metrów. ' +
          'Żołnierze kopią tunele między budynkami, atakują przez stropy i podłogi — góra i dół stają się ważniejsze niż przód i tył. ' +
          'Strzelec wyborowy Wasilij Zaitsev w ciągu miesiąca eliminuje 225 Niemców, wyostrzając instynkty przeżycia obu stron. ' +
          'Codziennie przychodzą nowe rozkazy: miasto musi trwać, bo za Wołgą nie ma ziemi, na którą można się cofnąć.',
      },
      {
        id: 'stalingrad_s2', perspective: 'side_a',
        title: 'Dom Pawłowa — twierdza z bloku',
        mood: 'heroic', duration: 235,
        text:
          'Starszy sierżant Jakow Pawłow ze swoim oddziałem osiemnastu żołnierzy zajmuje czteropiętrowy blok mieszkalny przy Placu 9 Stycznia. ' +
          'Przez pięćdziesiąt osiem dni bronią go przed wszystkimi atakami. Niemcy szturmują każdej nocy — i co noc giną na dziedzińcu lub klatce schodowej. ' +
          'Obrońcy kopią tunel pod ulicą, tworząc podziemny koryarz zaopatrzeniowy. Woda — z odciętej piwnicy. Amunicja — z ciał poległych wrogów. ' +
          'Czujkow powie potem: „W obronie tego jednego domu Niemcy stracili więcej żołnierzy niż przy zdobywaniu Paryża." ' +
          'Dom stoi do dziś. Ma własną tablicę pamiątkową. Pawłow dożył 84 lat.',
      },
      {
        id: 'stalingrad_s3', perspective: 'narrator',
        title: 'Operacja Uran — okrążenie',
        mood: 'strategic', duration: 270,
        text:
          'Żukow i Wasilewski planują w absolutnej tajemnicy. Przez trzy miesiące przerzucają posiłki nocą, maskują ruch oddziałów, dezinformują Niemców. ' +
          'Plan: dwa uderzenia przez słabo obsadzone flanki — rumuńskie dywizje Hitlera, kiepsko wyposażone i bez woli walki. ' +
          'Dziewiętnastego listopada 1942 trzy tysiące dział otwierają ogień przed świtem — flanki rumuńskie rozpadają się w ciągu godzin. ' +
          'Dwa ramiona sowieckiego okrążenia zamykają się 23 listopada pod Kałaczem nad Donem — 330 000 żołnierzy Paulusa jest w pierścieniu. ' +
          'Paulus melduje Hitlerowi o okrążeniu. Hitler odpowiada: „Stalingrad musi być utrzymany. Nie odstępować. Przesyłam zaopatrzenie lotnicze."',
      },
      {
        id: 'stalingrad_s4', perspective: 'side_b',
        title: 'Kocioł zimowy — koniec nadziei',
        mood: 'desperate', duration: 285,
        text:
          'Grudzień 1942 — temperatura spada do minus czterdziestu stopni. 330 000 ludzi w kotle bez ogrzewania, bez jedzenia, bez nadziei. ' +
          'Göring obiecał zaopatrzenie z powietrza — 500 ton dziennie. Luftwaffe dostarcza średnio 70. ' +
          'Próba odsieczy przez Mansteina zatrzymuje się 50 kilometrów od pierścienia — Paulus odmawia lub nie może się przebijać na spotkanie. ' +
          'Żołnierze 6. Armii jedzą konie, potem rzemienie, potem buty. Rannych nie można ewakuować — lotnisko jest zasypane i wystawione na ostrzał. ' +
          'Listy do domu kończą się słowami: „Wiem, że to koniec. Jestem spokojny." Wiele z nich nigdy nie wychodzi z kotła.',
      },
      {
        id: 'stalingrad_s5', perspective: 'narrator',
        title: 'Kapitulacja — i milczenie',
        mood: 'melancholic', duration: 225,
        text:
          'Drugiego lutego 1943 roku ostatnie oddziały 6. Armii składają broń. ' +
          'Hitler mianował Paulusa feldmarszałkiem dzień wcześniej — żaden feldmarszałek Rzeszy nigdy nie trafił do niewoli. Liczył, że Paulus wybierze śmierć. ' +
          'Paulus wychodzi z piwnic z rękami w górze i staje przed kamerami sowieckimi. Przez radio Niemcy słyszą przeraźliwą ciszę — zamiast fanfar, hejnałów i zwycięskich komunikatów, milczenie. ' +
          'Z 330 000 okrążonych: 91 000 trafia do sowieckich obozów. Do Niemiec wróci pięć do sześciu tysięcy — po dziesięciu latach łagrów. ' +
          'Stalingrad złamał kręgosłup Hitlerowskich Niemiec. Od tej chwili na wschodzie był już tylko odwrót.',
      },
    ],
  },
]; // koniec BATTLES

// ════════════════════════════════════════════════════════════
// INICJALIZACJA FIREBASE
// ════════════════════════════════════════════════════════════
function initFirebase(): { app: FirebaseApp; db: Firestore } {
  const app = getApps().length > 0 ? getApps()[0] : initializeApp(FIREBASE_CONFIG);
  const db  = getFirestore(app);
  return { app, db };
}

// ════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════
function log(msg: string, ...args: unknown[]): void {
  console.log(`[Seed] ${msg}`, ...args);
}

function logOk(msg: string): void {
  console.log(`  ✓ ${msg}`);
}

function logSkip(msg: string): void {
  console.log(`  – ${msg}`);
}

function logErr(msg: string, err: unknown): void {
  console.error(`  ✗ ${msg}`, err);
}

function totalDuration(battle: SeedBattle): number {
  return battle.scenes.reduce((s, sc) => s + sc.duration, 0);
}

// ════════════════════════════════════════════════════════════
// GŁÓWNA FUNKCJA SEED
// ════════════════════════════════════════════════════════════
async function seed(force: boolean, dryRun: boolean): Promise<void> {
  log(`Tryb: force=${force}, dry-run=${dryRun}`);
  log(`Bitew do przetworzenia: ${BATTLES.length}`);

  if (dryRun) {
    log('=== DRY-RUN — podgląd danych ===\n');
    for (const b of BATTLES) {
      const mins = Math.round(totalDuration(b) / 60);
      console.log(
        `  [${b.era.padEnd(12)}] ${b.id.padEnd(22)} | ${b.year.toString().padStart(5)} | ` +
        `${b.scenes.length} scen (${mins} min) | ${b.name}`,
      );
    }
    const totalScenes = BATTLES.reduce((s, b) => s + b.scenes.length, 0);
    const totalMins   = Math.round(BATTLES.reduce((s, b) => s + totalDuration(b), 0) / 60);
    log(`\nŁącznie: ${BATTLES.length} bitew, ${totalScenes} scen, ~${totalMins} minut narracji`);
    log('Dry-run zakończony — brak zapisu do Firestore.');
    return;
  }

  // Inicjalizuj Firebase
  log('Inicjalizuję Firebase…');
  let db: Firestore;
  try {
    ({ db } = initFirebase());
    log('Firebase OK');
  } catch (err) {
    logErr('Nie można zainicjalizować Firebase:', err);
    process.exit(1);
  }

  // Pobierz istniejące dokumenty
  log('Sprawdzam istniejące dokumenty…');
  let existingIds = new Set<string>();
  try {
    const snap = await getDocs(collection(db, 'battles'));
    snap.docs.forEach(d => existingIds.add(d.id));
    log(`Znaleziono ${existingIds.size} istniejących dokumentów`);
  } catch (err) {
    logErr('Błąd pobierania kolekcji battles:', err);
    if (!force) {
      log('Użyj --force aby kontynuować mimo błędu.');
      process.exit(1);
    }
  }

  // Firestore: maks. 500 operacji na batch
  const BATCH_SIZE = 400;
  let written = 0;
  let skipped = 0;
  let errors  = 0;

  const toWrite = force
    ? BATTLES
    : BATTLES.filter(b => !existingIds.has(b.id));

  const skippedList = BATTLES.filter(b => existingIds.has(b.id) && !force);
  for (const b of skippedList) {
    logSkip(`Pomijam (istnieje): ${b.id}  — użyj --force by nadpisać`);
    skipped++;
  }

  // Dziel na batch'e po 400
  for (let i = 0; i < toWrite.length; i += BATCH_SIZE) {
    const chunk = toWrite.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);

    for (const battle of chunk) {
      const ref = doc(db, 'battles', battle.id);
      batch.set(ref, battle, { merge: false }); // pełny zapis (nie merge)
    }

    try {
      await batch.commit();
      for (const battle of chunk) {
        logOk(`Zapisano: ${battle.id}  (${battle.scenes.length} scen)`);
        written++;
      }
    } catch (err) {
      logErr(`Batch ${i / BATCH_SIZE + 1} nie powiódł się:`, err);
      errors += chunk.length;
    }
  }

  // Podsumowanie
  console.log('\n════════════════════════════════════════════');
  log(`GOTOWE`);
  log(`  Zapisano:  ${written}`);
  log(`  Pominięto: ${skipped}`);
  log(`  Błędy:     ${errors}`);

  if (errors > 0) {
    log('\nSprawdź:');
    log('  1. Czy reguły Firestore pozwalają na zapis do /battles/{id}?');
    log('     match /battles/{id} { allow write: if true; }');
    log('  2. Czy projectId w FIREBASE_CONFIG jest poprawny?');
    log('  3. Czy masz dostęp do sieci?');
    process.exit(1);
  }

  log('\nPo zakończeniu PRZYWRÓĆ reguły Firestore:');
  log('  match /battles/{id} { allow read: if true; allow write: if false; }');
}

// ════════════════════════════════════════════════════════════
// ENTRYPOINT
// ════════════════════════════════════════════════════════════
const args    = process.argv.slice(2);
const force   = args.includes('--force');
const dryRun  = args.includes('--dry-run');

seed(force, dryRun).catch(err => {
  console.error('[Seed] Nieoczekiwany błąd:', err);
  process.exit(1);
});
