// ============================================================
// BATTLE ECHOES — FirebaseService.ts
// Firestore jako źródło bitew + postępów gracza
// Offline fallback: AsyncStorage cache → SEED_BATTLES
//
// LAZY REQUIRE: Firebase SDK ładowany dynamicznie, żeby crash SDK
// nie powodował crashu całej aplikacji w Expo Go.
// ============================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { FIREBASE_CONFIG } from '../constants/firebase';
import type { Battle, User } from '../store';

// ── Typy rozszerzonych danych z Firestore ─────────────────────
export interface Scene {
  id: string;
  title: string;
  mood: string;
  duration: number; // sekundy
  text: string;
  perspective: string;
}

export interface FullBattle extends Battle {
  subtitle?: string;
  year?: number;
  description?: string;
  commanderA?: string;
  commanderB?: string;
  scenes?: Scene[];
}

// ── Cache ─────────────────────────────────────────────────────
const CACHE_KEY    = 'be_battles_v4';
const CACHE_TS_KEY = 'be_battles_ts_v4';
const CACHE_TTL    = 60 * 60 * 1000; // 1 godzina

// ── Lokalna mapa imageUrl — thumbnail 800px z Wikimedia Commons ──
// Zawsze nadpisuje to co jest w Firestore (zapewnia spójne, lekkie URL-e)
const LOCAL_IMAGE_URLS: Record<string, string> = {
  'marathon-490bc':    'https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/Scene_of_the_Battle_of_Marathon.jpg/800px-Scene_of_the_Battle_of_Marathon.jpg',
  'cannae-216bc':      'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/The_Death_of_Paulus_Aemilius_at_the_Battle_of_Cannae_%28Yale_University_Art_Gallery_scan%29.jpg/800px-The_Death_of_Paulus_Aemilius_at_the_Battle_of_Cannae_%28Yale_University_Art_Gallery_scan%29.jpg',
  'thermopylae-480bc': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/L%C3%A9onidas_aux_Thermopyles_-_Jacques-Louis_David_-_Mus%C3%A9e_du_Louvre_Peintures_INV_3690_%3B_L_3711.jpg/800px-L%C3%A9onidas_aux_Thermopyles_-_Jacques-Louis_David_-_Mus%C3%A9e_du_Louvre_Peintures_INV_3690_%3B_L_3711.jpg',
  'grunwald-1410':     'https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/Jan_Matejko%2C_Bitwa_pod_Grunwaldem.jpg/800px-Jan_Matejko%2C_Bitwa_pod_Grunwaldem.jpg',
  'hastings-1066':     'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bb/Bayeux_Tapestry_scene57_Harold_death.jpg/800px-Bayeux_Tapestry_scene57_Harold_death.jpg',
  'agincourt-1415':    'https://upload.wikimedia.org/wikipedia/commons/thumb/b/be/Schlacht_von_Azincourt.jpg/800px-Schlacht_von_Azincourt.jpg',
  'lepanto-1571':      'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Laureys_a_Castro_-_The_Battle_of_Lepanto.jpeg/800px-Laureys_a_Castro_-_The_Battle_of_Lepanto.jpeg',
  'vienna-1683':       'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Anonym_Entsatz_Wien_1683.jpg/800px-Anonym_Entsatz_Wien_1683.jpg',
  'waterloo-1815':     'https://upload.wikimedia.org/wikipedia/commons/thumb/7/72/Battle_of_Waterloo_1815.PNG/800px-Battle_of_Waterloo_1815.PNG',
  'austerlitz-1805':   'https://upload.wikimedia.org/wikipedia/commons/thumb/b/ba/La_bataille_d%27Austerlitz._2_decembre_1805_%28Fran%C3%A7ois_G%C3%A9rard%29.jpg/800px-La_bataille_d%27Austerlitz._2_decembre_1805_%28Fran%C3%A7ois_G%C3%A9rard%29.jpg',
  'borodino-1812':     'https://upload.wikimedia.org/wikipedia/commons/thumb/4/43/Battle_of_Borodino.jpg/800px-Battle_of_Borodino.jpg',
  'ypres-1914':        'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Into_the_Jaws_of_Death_23-0455M_edit.jpg/800px-Into_the_Jaws_of_Death_23-0455M_edit.jpg',
  'verdun-1916':       'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Battle_of_Verdun_map.png/800px-Battle_of_Verdun_map.png',
  'somme-1916':        'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Map_of_the_Battle_of_the_Somme%2C_1916.svg/800px-Map_of_the_Battle_of_the_Somme%2C_1916.svg.png',
  'stalingrad-1942':   'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ae/The_Battle_of_Stalingrad_second_collage.jpg/800px-The_Battle_of_Stalingrad_second_collage.jpg',
  'normandy-1944':     'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Into_the_Jaws_of_Death_23-0455M_edit.jpg/800px-Into_the_Jaws_of_Death_23-0455M_edit.jpg',
  'berlin-1945':       'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/Raising_a_flag_over_the_Reichstag_-_Restoration.jpg/800px-Raising_a_flag_over_the_Reichstag_-_Restoration.jpg',
  // Dodatkowe bitwy z MOCK_BATTLES (poza zestawem Wikimedia)
  'gettysburg-1863':   'https://upload.wikimedia.org/wikipedia/commons/thumb/3/39/Pickett%27s_Charge%2C_Gettysburg%2C_by_Thure_de_Thulstrup.jpg/800px-Pickett%27s_Charge%2C_Gettysburg%2C_by_Thure_de_Thulstrup.jpg',
  'britain-1940':      'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Royal_Air_Force_Fighter_Command%2C_1939-1945._C2123.jpg/800px-Royal_Air_Force_Fighter_Command%2C_1939-1945._C2123.jpg',
  'kursk-1943':        'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/Bundesarchiv_Bild_183-J14813%2C_Russland%2C_Kampf_um_Kursk%2C_Panzer_VI_%28Tiger_I%29.jpg/800px-Bundesarchiv_Bild_183-J14813%2C_Russland%2C_Kampf_um_Kursk%2C_Panzer_VI_%28Tiger_I%29.jpg',
  // Bitwy z Firestore użytkownika (poza standardowym zestawem)
  'marne-1914':        'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/BatailleMarneGermans.jpg/800px-BatailleMarneGermans.jpg',
  'rocroi-1643':       'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bd/Bataille_de_Rocroi%2C_par_Philippoteaux.jpg/800px-Bataille_de_Rocroi%2C_par_Philippoteaux.jpg',
};

function applyLocalImages(battles: Battle[]): Battle[] {
  return battles.map(b => ({
    ...b,
    imageUrl: LOCAL_IMAGE_URLS[b.id] ?? b.imageUrl,
  }));
}

// ── Dane startowe (seed) ──────────────────────────────────────
const SEED_BATTLES: Battle[] = [
  {
    id: 'grunwald-1410', name: 'Bitwa pod Grunwaldem', era: 'medieval',
    date: '15 lipca 1410',
    location: { name: 'Grunwald, Polska', lat: 53.4833, lng: 20.1167 },
    summary: 'Jedna z największych bitew średniowiecznej Europy.',
    outcome: 'Zwycięstwo Polski i Litwy',
    sides: ['Królestwo Polskie i Litwa', 'Zakon Krzyżacki'],
    commanders: ['Władysław II Jagiełło', 'Ulrich von Jungingen'],
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/Jan_Matejko%2C_Bitwa_pod_Grunwaldem.jpg/800px-Jan_Matejko%2C_Bitwa_pod_Grunwaldem.jpg',
  },
  {
    id: 'ypres-1914', name: 'Pierwsza Bitwa pod Ypres', era: 'ww1',
    date: 'Październik–Listopad 1914',
    location: { name: 'Ypres, Belgia', lat: 50.8503, lng: 2.8787 },
    summary: 'Starcia o kontrolę nad belgijskim Ypres.',
    outcome: 'Alianckie utrzymanie Ypres',
    sides: ['Ententa', 'Cesarstwo Niemieckie'],
    commanders: ['John French', 'Erich von Falkenhayn'],
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Into_the_Jaws_of_Death_23-0455M_edit.jpg/800px-Into_the_Jaws_of_Death_23-0455M_edit.jpg',
  },
  {
    id: 'waterloo-1815', name: 'Bitwa pod Waterloo', era: 'napoleon',
    date: '18 czerwca 1815',
    location: { name: 'Waterloo, Belgia', lat: 50.6800, lng: 4.4120 },
    summary: 'Ostateczna klęska Napoleona Bonaparte.',
    outcome: 'Zwycięstwo Koalicji',
    sides: ['Koalicja (Wielka Brytania, Prusy)', 'Cesarstwo Francuskie'],
    commanders: ['Wellington, Blücher', 'Napoleon Bonaparte'],
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/72/Battle_of_Waterloo_1815.PNG/800px-Battle_of_Waterloo_1815.PNG',
  },
  {
    id: 'cannae-216bc', name: 'Bitwa pod Kannami', era: 'ancient',
    date: '2 sierpnia 216 p.n.e.',
    location: { name: 'Kanny, Italia', lat: 41.3050, lng: 16.1325 },
    summary: 'Podwójne okrążenie Hannibala — największa klęska Republiki Rzymskiej.',
    outcome: 'Druzgocące zwycięstwo Kartaginy',
    sides: ['Kartagina', 'Republika Rzymska'],
    commanders: ['Hannibal Barkas', 'Lucjusz Emiliusz Paulus'],
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/The_Death_of_Paulus_Aemilius_at_the_Battle_of_Cannae_%28Yale_University_Art_Gallery_scan%29.jpg/800px-The_Death_of_Paulus_Aemilius_at_the_Battle_of_Cannae_%28Yale_University_Art_Gallery_scan%29.jpg',
  },
  {
    id: 'hastings-1066', name: 'Bitwa pod Hastings', era: 'medieval',
    date: '14 października 1066',
    location: { name: 'Hastings, Anglia', lat: 50.9087, lng: 0.4857 },
    summary: 'Wilhelm Zdobywca pokonał Harolda II — początek normandzkiego panowania.',
    outcome: 'Zwycięstwo Normanów',
    sides: ['Normandia', 'Anglia anglosaska'],
    commanders: ['Wilhelm Zdobywca', 'Harold II Godwinson'],
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bb/Bayeux_Tapestry_scene57_Harold_death.jpg/800px-Bayeux_Tapestry_scene57_Harold_death.jpg',
  },
  {
    id: 'vienna-1683', name: 'Bitwa pod Wiedniem', era: 'early_modern',
    date: '12 września 1683',
    location: { name: 'Wiedeń, Austria', lat: 48.2082, lng: 16.3738 },
    summary: 'Sobieski złamał oblężenie Wiednia — ostatnia wielka szarża husarii.',
    outcome: 'Zwycięstwo Ligi Świętej',
    sides: ['Liga Święta (Polska, Austria, Niemcy)', 'Imperium Osmańskie'],
    commanders: ['Jan III Sobieski', 'Kara Mustafa'],
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Anonym_Entsatz_Wien_1683.jpg/800px-Anonym_Entsatz_Wien_1683.jpg',
  },
  {
    id: 'rocroi-1643', name: 'Bitwa pod Rocroi', era: 'early_modern',
    date: '19 maja 1643',
    location: { name: 'Rocroi, Francja', lat: 49.9269, lng: 4.5231 },
    summary: 'Condé rozbił hiszpańskie tercios — koniec mitu niezwyciężonej piechoty.',
    outcome: 'Zwycięstwo Francji',
    sides: ['Królestwo Francji', 'Hiszpania Habsburgów'],
    commanders: ['Ludwik de Bourbon (Condé)', 'Francisco de Melo'],
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bd/Bataille_de_Rocroi%2C_par_Philippoteaux.jpg/800px-Bataille_de_Rocroi%2C_par_Philippoteaux.jpg',
  },
  {
    id: 'marne-1914', name: 'Pierwsza Bitwa nad Marną', era: 'ww1',
    date: '5–12 września 1914',
    location: { name: 'Marna, Francja', lat: 48.9600, lng: 3.3800 },
    summary: 'Zatrzymanie niemieckiej ofensywy — koniec planu Schlieffena.',
    outcome: 'Zwycięstwo Ententy',
    sides: ['Francja i Wielka Brytania', 'Cesarstwo Niemieckie'],
    commanders: ['Joseph Joffre', 'Helmuth von Moltke mł.'],
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/BatailleMarneGermans.jpg/800px-BatailleMarneGermans.jpg',
  },
  {
    id: 'normandy-1944', name: 'Lądowanie w Normandii (D-Day)', era: 'ww2',
    date: '6 czerwca 1944',
    location: { name: 'Normandia, Francja', lat: 49.3672, lng: -0.8731 },
    summary: 'Największa operacja desantowa w historii — otwarcie drugiego frontu.',
    outcome: 'Zwycięstwo Aliantów',
    sides: ['Alianci (USA, Wielka Brytania, Kanada)', 'Niemcy nazistowskie'],
    commanders: ['Dwight D. Eisenhower', 'Erwin Rommel'],
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Into_the_Jaws_of_Death_23-0455M_edit.jpg/800px-Into_the_Jaws_of_Death_23-0455M_edit.jpg',
  },
  {
    id: 'berlin-1945', name: 'Bitwa o Berlin', era: 'ww2',
    date: '16 kwietnia – 2 maja 1945',
    location: { name: 'Berlin, Niemcy', lat: 52.5200, lng: 13.4050 },
    summary: 'Ostatnia wielka bitwa w Europie — upadek III Rzeszy.',
    outcome: 'Zwycięstwo ZSRR, upadek III Rzeszy',
    sides: ['ZSRR', 'Niemcy nazistowskie'],
    commanders: ['Georgi Żukow', 'Helmuth Weidling'],
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/Raising_a_flag_over_the_Reichstag_-_Restoration.jpg/800px-Raising_a_flag_over_the_Reichstag_-_Restoration.jpg',
  },
];

// ── Mock sceny lokalne — fallback gdy Firestore jest pusty ─────────────────
// Tempo narracji: ~130 słów/min → duration ≈ Math.round(wordCount / 130 * 60)
// Pokrywa wszystkie bitwy z LOCAL_IMAGE_URLS + MOCK_BATTLES.
// ──────────────────────────────────────────────────────────────────────────
const MOCK_SCENES: Record<string, Scene[]> = {

  /* ═══════════════════════ STAROŻYTNOŚĆ ═══════════════════════ */

  'thermopylae-480bc': [
    {
      id: 'thermopylae-480bc-scene-1',
      title: 'Wąwóz śmierci',
      mood: 'atmospheric',
      duration: 52,
      perspective: 'narrator',
      text: 'Sierpień, 480 rok przed Chrystusem. Wąwóz Termopile — zaledwie pięćdziesiąt kroków szeroki między górskim klifem a Morzem Egejskim. Trzystu Spartan pod wodzą króla Leonidasa zajęło tę naturalną twierdzę. Przed nimi maszerowała armia Kserksesa. Persowie zatrzymali się. Wysłańcy żądali złożenia broni. Leonidas odpowiedział słowami, które przetrwały wieki: Molon labe — przyjdź i weź.',
    },
    {
      id: 'thermopylae-480bc-scene-2',
      title: 'Trzy dni chwały',
      mood: 'heroic',
      duration: 60,
      perspective: 'narrator',
      text: 'Przez dwa dni Spartanie demolowali kolejne fale perskich ataków. Ich zdyscyplinowana falanga działała jak żywa maszyna — tarcza przy tarczy, krótki miecz pracujący w rytmie. Persowie tracili tysiące, Spartanie — jednostki. Kserkses w gniewie zesłał swoich najlepszych wojowników, nieśmiertelnych. Odrzucono ich tak samo. Wieść o trzystu mężczyznach, którzy zatrzymali imperium, rozeszła się po całej Helladzie.',
    },
    {
      id: 'thermopylae-480bc-scene-3',
      title: 'Ostatnia noc',
      mood: 'melancholic',
      duration: 62,
      perspective: 'narrator',
      text: 'Trzeciego dnia Efialtes, Grek z Malis, za obietnicę nagrody wskazał Persom górską ścieżkę omijającą wąwóz. Leonidas odesłał sprzymierzeńców. Z Lacedemończykami zostało siedmiuset Tespiańczyków — z własnej woli. Ostatnia bitwa toczyła się na pagórku za wąwozem. Spartanie walczyli złamanymi mieczami i gołymi rękami. Wszyscy polegli. Na kamieniu wyryto słowa: Przechodniu, powiedz Sparcie, żeśmy tu leżeli, jej prawom wierni.',
    },
  ],

  'marathon-490bc': [
    {
      id: 'marathon-490bc-scene-1',
      title: 'Równina Maratońska',
      mood: 'tense',
      duration: 50,
      perspective: 'narrator',
      text: 'Wrzesień, 490 rok przed Chrystusem. Na równinie u podnóża gór Attyki ląduje perska armia Dariusza Wielkiego. Naprzeciwko staje dziesięć tysięcy ateńskich hoplitów. Ateny wysłały biegacza Feidippidesa do Sparty — Spartanie powiedzieli, że przybędą po nowiu. Za późno. Ateny musiały bronić się same. Wódz Miltiades zebrał strategów i przekonał ich do jedynej słusznej taktyki: natychmiastowego ataku.',
    },
    {
      id: 'marathon-490bc-scene-2',
      title: 'Grecka szarża',
      mood: 'charge',
      duration: 55,
      perspective: 'narrator',
      text: 'Hoplici ateńscy ruszyli biegiem — to był szok dla Persów. Nikt nie szarżował biegiem w pełnej zbroi. Wzmocnione skrzydła greckiej linii przełamały perskie flanki, a potem obie połówki zaatakowały centrum z boku. Persowie znaleźli się okrążeni. Miltiades wiedział: centrum musi trzymać wystarczająco długo. I trzymało. Persowie zaczęli uciekać ku swoim okrętom. Ateńczycy ścigali ich do samego morza.',
    },
    {
      id: 'marathon-490bc-scene-3',
      title: 'Bieg do historii',
      mood: 'triumphant',
      duration: 50,
      perspective: 'narrator',
      text: 'Sześć tysięcy czterystu Persów zginęło. Ateńczycy stracili stu dziewięćdziesięciu dwóch mężczyzn, pochowanych z honorem w kurhanie stojącym do dziś. Feidippides pobiegł do Aten z wieścią — czterdzieści kilometrów w pełnym słońcu. Według legendy wpadł do zgromadzenia, krzyknął Zwyciężyliśmy i padł martwy. Maraton był pierwszym dowodem, że Persja nie jest niepokonana — i pierwszym kamieniem pod fundament europejskiej tożsamości.',
    },
  ],

  'cannae-216bc': [
    {
      id: 'cannae-216bc-scene-1',
      title: 'Pułapka geniusza',
      mood: 'strategic',
      duration: 55,
      perspective: 'narrator',
      text: 'Drugi dzień sierpnia, 216 rok przed Chrystusem. Na równinie apulijskiej przy rzece Aufidus osiemdziesiąt pięć tysięcy Rzymian stanęło naprzeciwko czterdziestu pięciu tysięcy Kartagińczyków pod wodzą Hannibala Barkasa. Rzym miał ogromną przewagę liczebną i wiedział, jak atakować frontalnie. Właśnie na to Hannibal czekał. Słabsze centrum wysunął do przodu, elitarną kawalerię ustawił na skrzydłach. To była przemyślana pułapka.',
    },
    {
      id: 'cannae-216bc-scene-2',
      title: 'Śmiertelny uścisk',
      mood: 'brutal',
      duration: 62,
      perspective: 'narrator',
      text: 'Gdy Rzym zaatakował centrum, Kartagińczycy powoli się cofali — jak zaplanowano. Legiony wchodziły coraz głębiej, tłocząc się i tracąc manewrowość. Kawaleria na skrzydłach okrążyła całą armię. Kiedy Kartagińczycy zaatakowali Rzymian z tyłu i z boków, każdy żołnierz wiedział, że ucieczki nie ma. Masakra trwała kilka godzin. Zginęło siedemdziesiąt tysięcy Rzymian — w tym dwóch konsulów i osiemdziesięciu senatorów.',
    },
    {
      id: 'cannae-216bc-scene-3',
      title: 'Wieczna lekcja',
      mood: 'melancholic',
      duration: 58,
      perspective: 'narrator',
      text: 'Kanny stały się wzorcem dla wszystkich późniejszych dowódców pragnących okrążenia wroga. Schlieffen studiował je przed swoim planem z 1914 roku. Patton i Rommel recytowali Hannibala. Ale Kanny nie wygrały Hannibalowi wojny. Bez machin oblężniczych nie ruszył na Rzym. Rzym odrodził się. Gdy Scypion Afrykański pokonał Hannibala pod Zamą, użył tej samej taktyki okrążenia. Najlepszy uczeń pokonał nauczyciela jego własną bronią.',
    },
  ],

  /* ═══════════════════════ ŚREDNIOWIECZE ══════════════════════ */

  'grunwald-1410': [
    {
      id: 'grunwald-1410-scene-1',
      title: 'Świt przed burzą',
      mood: 'atmospheric',
      duration: 55,
      perspective: 'narrator',
      text: 'Piętnasty dzień lipca, rok 1410. Słońce wschodzi powoli nad polami Grunwaldu, jakby samo ociągało się przed tym, co ma nadejść. Dwie armie stoją naprzeciwko siebie w milczeniu — po jednej stronie Krzyżacy w lśniących zbrojach, po drugiej wojska polsko-litewskie, mozaika języków i chorągwi. Ulrich von Jungingen przejechał wzdłuż swojej linii, pewny siebie. Jagiełło klęczał w namiocie na modlitwie. Nikt z żołnierzy nie wiedział, że za kilka godzin losy Europy Środkowej zmienią się na zawsze.',
    },
    {
      id: 'grunwald-1410-scene-2',
      title: 'Wielkie starcie',
      mood: 'dramatic',
      duration: 65,
      perspective: 'narrator',
      text: 'Trębacze dali znak. Wojska litewskie ruszyły pierwsze, ale szybko cofnęły się — pozorowany odwrót, który wciągnął część Krzyżaków w pościg. W tym samym momencie polskie rycerstwo uderzyło z całą siłą. Ryk tysięcy gardeł zlał się z łoskotem stali o stal. Wąski front pola bitwy zamienił się w chaos — konie, ludzie, chorągwie. Wielka Chorągiew Krakowska upadła, lecz rycerze Zawiszy Czarnego wydarli ją z rąk wroga. Bitwa trwała ponad dziesięć godzin.',
    },
    {
      id: 'grunwald-1410-scene-3',
      title: 'Zmierzch Zakonu',
      mood: 'triumphant',
      duration: 58,
      perspective: 'narrator',
      text: 'Kiedy Ulrich von Jungingen zginął w boju, opór Krzyżaków się załamał. Wielki mistrz leżał martwy na polu — to był moment, który przesądził o wszystkim. Wojska polsko-litewskie ścigały uciekających przez kilka mil. Spośród sześćdziesięciu jeden chorągwi krzyżackich, pięćdziesiąt jedna wpadło w ręce zwycięzców. Grunwald stał się największą klęską Zakonu w jego historii. Polska i Litwa mogły odetchnąć. Dziś to pole ciszy mówi głosem historii.',
    },
  ],

  'hastings-1066': [
    {
      id: 'hastings-1066-scene-1',
      title: 'Dwa roszczenia do tronu',
      mood: 'atmospheric',
      duration: 52,
      perspective: 'narrator',
      text: 'Październik 1066, Anglia. Król Harold Godwinson ledwo zdążył rozbić inwazję norweską pod Stamford Bridge — teraz musi maszerować na południe. Wilhelm Zdobywca, książę Normandii, wylądował z siedmioma tysiącami żołnierzy w zatoce Pevensey. Harold ma mniej niż dwa tygodnie. Jego armia jest zmęczona, część gwardii poległa na północy. Czternastego października obie armie stanęły naprzeciwko siebie pod Hastings, na wzgórzu Senlac.',
    },
    {
      id: 'hastings-1066-scene-2',
      title: 'Wzgórze Senlac',
      mood: 'dramatic',
      duration: 62,
      perspective: 'narrator',
      text: 'Anglicy zajęli wzgórze i ustawili się w saxońską tarczownicę — szczelny mur z tarcz. Normanowie atakowali przez cały dzień bez skutku. Kluczowy był epizod pozorowanej ucieczki Normanów — część Anglosasów złamała szyk i ruszyła w pościg. Wzgórze straciło spójność. Przez kolejne godziny Wilhelm wdzierał się kawałek po kawałku w osłabioną linię. Harold walczył osobiście. Kiedy strzała trafiła go w oko, dowódcy zabrakło i Anglosasi polegli niemal wszyscy.',
    },
    {
      id: 'hastings-1066-scene-3',
      title: 'Nowa Anglia',
      mood: 'melancholic',
      duration: 55,
      perspective: 'narrator',
      text: 'Po Hastings nie było już powrotu. Wilhelm Zdobywca koronował się w Westminsterze w Boże Narodzenie 1066. Normańska arystokracja zastąpiła anglosaxońską. Język angielski wchłonął tysiące słów normańsko-francuskich. System feudalny przykrył starą Anglię jak plandeka. Anglicy mówią o tym zdarzeniu tyle wieków później tak samo: the Conquest, Podbój. Jakby nic innego nie zasługiwało na to słowo.',
    },
  ],

  'agincourt-1415': [
    {
      id: 'agincourt-1415-scene-1',
      title: 'Błoto i strach',
      mood: 'tense',
      duration: 52,
      perspective: 'narrator',
      text: 'Październik 1415, Francja Północna. Armia Henryka Piątego jest w pułapce — dwa tygodnie marszu przez wrogie terytorium, choroby, brak jedzenia. Zostało może sześć tysięcy żołnierzy. Przed nimi stoi dwadzieścia pięć tysięcy rycerzy francuskich. Francuzi nie śpieszą się — mają Anglików jak w sieci. Kłócą się, kto będzie miał zaszczyt pojmać króla dla okupu. Henryk klęczy w nocy na modlitwie. Świta powoli. Pole jest wąskie, flanki chronią lasy.',
    },
    {
      id: 'agincourt-1415-scene-2',
      title: 'Deszcz strzał',
      mood: 'heroic',
      duration: 62,
      perspective: 'narrator',
      text: 'Anglicy mieli jeden skarb: sześć tysięcy łuczników długołukowych, zdolnych do dziesięciu strzałów na minutę z dwustu metrów. Kiedy Henryk kazał strzelać, niebo zaciemniło się. Sześćdziesiąt tysięcy strzał na minutę runęło na rycerzy maszerujących przez rozmiękłe pole. Zbroje chroniły tułów, ale nie konie, nie szczelinki wizjery. Rycerze padali. Konie szalały. Ci, którzy dotarli blisko — wyczerpani, zakleszczeni w błocie — łatwo ginęli od angielskich noży.',
    },
    {
      id: 'agincourt-1415-scene-3',
      title: 'Triumf nieprawdopodobny',
      mood: 'triumphant',
      duration: 55,
      perspective: 'narrator',
      text: 'Bitwa trwała mniej niż trzy godziny. Francuzi stracili ponad sześć tysięcy zabitych — wśród nich trzech książąt i stu pięciu baronów. Anglicy stracili może pięćset ludzi. Agincourt to jeden z najdramatyczniejszych przykładów w historii, jak dyscyplina i właściwa broń mogą pokonać liczebną przewagę. Długi łuk — angielska technologia stulecia — wygrał z feudalnym rycerstwem. Średniowiecze właśnie zaczęło się kończyć.',
    },
  ],

  /* ══════════════════════ NOWOŻYTNOŚĆ ════════════════════════ */

  'lepanto-1571': [
    {
      id: 'lepanto-1571-scene-1',
      title: 'Śródziemnomorska szachownica',
      mood: 'atmospheric',
      duration: 52,
      perspective: 'narrator',
      text: 'Październik 1571, Zatoka Lepanto. Liga Święta wystawiła największą flotę od czasów starożytnych: dwieście pięć galer. Naprzeciwko stoi flota osmańska pod wodzą Alego Paszy. Osmanie kontrolują wschodnie Śródziemnomorze od dziesięcioleci. Europa traktuje to starcie jak krucjatę. Chrześcijaństwo kontra islam, Zachód kontra Wschód. Na obu okrętach kapłani odprawiali nabożeństwa. Obie strony modliły się o zwycięstwo do swojego Boga.',
    },
    {
      id: 'lepanto-1571-scene-2',
      title: 'Starcie galer',
      mood: 'dramatic',
      duration: 62,
      perspective: 'narrator',
      text: 'Bitwa zaczęła się od ognia artyleryjskiego, potem galery taranowały się i łączyły w pary do walki wręcz. Wenecjanie używali galer bastarda — niżej osadzonych, z cięższą artylerią. Walka trwała cztery godziny — piekło hałasu, dymu i krwi na ciasnych pokładach. Don Juan de Austria walczył osobiście przy dziobowych armatach. Ali Pasza zginął w walce, jego głowę zatknięto na maszcie. Widok padającego osmańskiego okrętu flagowego złamał morale całej floty.',
    },
    {
      id: 'lepanto-1571-scene-3',
      title: 'Granica ekspansji',
      mood: 'triumphant',
      duration: 55,
      perspective: 'narrator',
      text: 'Liga Święta zdobyła sto siedemdziesiąt trzy galery osmańskie i wyzwoliła dwanaście tysięcy chrześcijańskich niewolników przykutych do wioseł. Wśród rannych na chrześcijańskich galerach był Miguel de Cervantes, przyszły autor Don Kichota. Osmańska ekspansja morska na Zachodzie zamarła — nigdy więcej nie zagroziła Włochom ani Hiszpanii od strony morza. Lepanto wyznaczył granicę, której Półksiężyc już nie przekroczył.',
    },
  ],

  'vienna-1683': [
    {
      id: 'vienna-1683-scene-1',
      title: 'Pod murami Wiednia',
      mood: 'desperate',
      duration: 55,
      perspective: 'narrator',
      text: 'Lato 1683. Wielki Wezyr Kara Mustafa stanął pod murami Wiednia ze sto czterdziestoma tysiącami żołnierzy. Miasto broniło piętnaście tysięcy żołnierzy. Przez dwa miesiące Turcy kopali okopy i minowali mury, a obrońcy łatali wyłomy i robili wycieczki nocne. Cesarz Leopold uciekł z Wiednia. Żywność się kończyła. Mury kruszyły się. Jedyną nadzieją była odsiecz z zewnątrz — jeśli nadejdzie na czas.',
    },
    {
      id: 'vienna-1683-scene-2',
      title: 'Husaria na wzgórzu',
      mood: 'charge',
      duration: 65,
      perspective: 'narrator',
      text: 'Dwunastego września 1683, z Kahlenbergu ruszyła największa szarża kawalerii w historii nowożytnej. Siedemdziesiąt tysięcy żołnierzy koalicji, w tym dwadzieścia tysięcy Polaków pod wodzą Jana Sobieskiego, uderzyło na obóz turecki ze wzgórz. Na czele polskiego uderzenia szło osiemnaście tysięcy husarzy z skrzydłami, błyszczących w słońcu. Szarża z Kahlenbergu trwała dwie godziny. Turcy, atakujący wciąż mury, nagle znaleźli się okrążeni. Kara Mustafa uciekł jako jeden z pierwszych.',
    },
    {
      id: 'vienna-1683-scene-3',
      title: 'Koniec osmańskiej ekspansji',
      mood: 'triumphant',
      duration: 58,
      perspective: 'narrator',
      text: 'Wiedeń był ocalony. Kara Mustafa uciekł do Belgradu, gdzie na rozkaz sułtana stracono go jedwabnym sznurem. Jan Sobieski napisał do papieża nawiązując do Juliusza Cezara: Przyszedłem, zobaczyłem, Bóg zwyciężył. Wiktoria pod Wiedniem to ostatnia wielka bitwa, w której Imperium Osmańskie zagroziło Europie Środkowej. Od 1683 roku Turcy będą się już tylko cofać — przez kolejne sto lat stracą Węgry, Transylwanię, część Bałkanów.',
    },
  ],

  'rocroi-1643': [
    {
      id: 'rocroi-1643-scene-1',
      title: 'Chwała Flandrii',
      mood: 'tense',
      duration: 52,
      perspective: 'narrator',
      text: 'Dziewiętnasty maja 1643. Przy fortecy Rocroi na granicy belgijsko-francuskiej spotykają się dwie armie. Hiszpanie oblegają twierdzę. Francja jest w kryzysie: umarł Richelieu, umarł Ludwik XIII, na tronie siedzi pięcioletnie dziecko. Armią dowodzi nikomu nieznany dwudziestodwuletni książę de Enghien — późniejszy Wielki Kondé. To jego pierwsza bitwa w roli naczelnego dowódcy.',
    },
    {
      id: 'rocroi-1643-scene-2',
      title: 'Atak Kondé',
      mood: 'charge',
      duration: 60,
      perspective: 'narrator',
      text: 'Kondé ustawił kawalerię na skrzydłach, piechotę w centrum. Zaatakował lewym skrzydłem błyskawicznie, przełamał hiszpańską kawalerię, okrążył centrum i zaatakował z tyłu. Manewr przeprowadził z precyzją weterana. Centrum hiszpańskie — tercios, najsławniejsi żołnierze tamtych czasów — walczyło do końca nawet okrążone. Stare tercio walońskie odmówiło poddania się i zostało prawie doszczętnie wybite. Było to ostatnie wielkie zwycięstwo tercios.',
    },
    {
      id: 'rocroi-1643-scene-3',
      title: 'Koniec hiszpańskiej piechoty',
      mood: 'dramatic',
      duration: 55,
      perspective: 'narrator',
      text: 'Rocroi był symbolicznym końcem epoki hiszpańskiej dominacji wojskowej. Tercios — bloki pikinierów i muszkieterów, które przez sto lat dominowały w Europie — okazały się podatne na szybką, mobilną kawalerię. Francja zaczęła drogę ku hegemonii, którą osiągnie za Ludwika XIV. Kondé, teraz Wielki Kondé, zostanie jednym z najsławniejszych dowódców epoki. Tamtego ranka miał dwadzieścia dwa lata i wygrał swoją pierwszą bitwę z wyczuciem starego weterana.',
    },
  ],

  /* ══════════════════════ ERA NAPOLEOŃSKA ═════════════════════ */

  'austerlitz-1805': [
    {
      id: 'austerlitz-1805-scene-1',
      title: 'Mgła nad doliną',
      mood: 'strategic',
      duration: 55,
      perspective: 'narrator',
      text: 'Drugi dzień grudnia 1805. Mgła zalega dolinę, gdy Napoleon wchodzi na wzgórze Santon. Przed nim sto tysięcy żołnierzy Rosji i Austrii. Napoleon celowo osłabił prawe skrzydło, by wciągnąć wrogów w kuszący atak. Koalicja wpadła w pułapkę jak w sidła zaplanowane co do minuty. Feldmarszałek Kutuzow miał złe przeczucia, ale car Aleksander nalegał na atak. Tego ranka wszystko szło według planu Korsykanina.',
    },
    {
      id: 'austerlitz-1805-scene-2',
      title: 'Słońce Austerlitz',
      mood: 'triumphant',
      duration: 60,
      perspective: 'narrator',
      text: 'Gdy koalicja zaatakowała prawe skrzydło Francuzów, jej centrum osłabło. Napoleon czekał na ten moment. Marszałek Soult uderzył na wzgórze Pratzen z trzema dywizjami — w czterdzieści minut zajął dominującą pozycję. Armia koalicji rozpadła się na dwie izolowane części. Jeziora na południu były pokryte cienkim lodem. Cesarz kazał strzelać do lodu artylerią. Straty koalicji: trzydzieści sześć tysięcy zabitych, rannych i jeńców. Francuzi stracili dziewięć tysięcy.',
    },
    {
      id: 'austerlitz-1805-scene-3',
      title: 'Upadek Świętego Cesarstwa',
      mood: 'dramatic',
      duration: 52,
      perspective: 'narrator',
      text: 'Cesarz Franciszek II Habsburg prosił o zawieszenie broni na polu bitwy. Dwa miesiące po Austerlitz abdykował z tytułu cesarza Świętego Cesarstwa Rzymskiego — kończąc instytucję istniejącą tysiąc lat. Napoleon stał u szczytu potęgi. Europa leżała u jego stóp. Ale ci, którzy widzieli jego twarz tamtego wieczoru, mówili, że wyglądał na zmęczonego, nie triumfalnego. Jakby wiedział, że od tego momentu wszystko już pójdzie z górki.',
    },
  ],

  'borodino-1812': [
    {
      id: 'borodino-1812-scene-1',
      title: 'Przed wielką rzezią',
      mood: 'tense',
      duration: 52,
      perspective: 'narrator',
      text: 'Siódmego września 1812 roku pod Moskwą. Generał Kutuzow wybrał pole bitwy świadomie — otwarta równina z fortyfikacjami na wzgórzach. Armia rosyjska: sto dwadzieścia tysięcy żołnierzy. Napoleon miał sto trzydzieści tysięcy, ale wyczerpanych gigantycznym marszem. Obaj dowódcy wiedzieli, że ta bitwa zdecyduje o losie kampanii. Kutuzow modlił się. Napoleon siedział przy ognisku i milczał. Miał katar, był ospały. Nadchodzący dzień okaże się jego najdroższym zwycięstwem.',
    },
    {
      id: 'borodino-1812-scene-2',
      title: 'Baterie na wzgórzach',
      mood: 'brutal',
      duration: 65,
      perspective: 'narrator',
      text: 'Bitwa trwała szesnaście godzin. Artyleria obu stron prowadziła ogień niemal nieprzerwanie — huk słyszano w Moskwie, trzydzieści kilometrów dalej. Wielka reduta Rajewskiego zmieniała właściciela kilka razy. Żołnierz opisze potem: ziemia była tak pokryta ciałami, że szło się jak po bruku, nie dotykając trawy. Napoleon nie rzucił Starej Gwardii — i ta decyzja dręczyła go do końca życia. Bez ostatniego uderzenia Rosjanom udało się wycofać.',
    },
    {
      id: 'borodino-1812-scene-3',
      title: 'Pyrrusowe zwycięstwo',
      mood: 'melancholic',
      duration: 58,
      perspective: 'narrator',
      text: 'Rosja oddała Moskwę — ale nie oddała wojny. Napoleon wkroczył do pustego miasta, które tygodniami płonęło z rozkazu rosyjskiego gubernatora. Zimą Wielka Armia zaczęła długą drogę powrotną przez śnieg i mróz. Z pół miliona żołnierzy, którzy przekroczyli Niemen w czerwcu, do Prus powróciło może sto tysięcy. Borodino okazało się nie tyle zwycięstwem, co początkiem końca imperialnego snu.',
    },
  ],

  'waterloo-1815': [
    {
      id: 'waterloo-1815-scene-1',
      title: 'Deszczowa noc cesarza',
      mood: 'tense',
      duration: 55,
      perspective: 'narrator',
      text: 'Siedemnasty czerwca 1815, noc. Napoleon nie śpi w kwaterze Le Caillou. Deszcz bębni w okno. Cesarz wie, że jutro wszystko zostanie rozstrzygnięte. Obie armie są wyczerpane. Wellington czeka na Prusaków Blüchera. Napoleon liczy na to, że zdąży rozbić Anglików przed ich przybyciem. Jutro będziemy spać w Brukseli, mówi do generałów. Ale ziemia jest rozmiękła, armaty grzęzną w błocie. Cesarz odkłada atak na poranek.',
    },
    {
      id: 'waterloo-1815-scene-2',
      title: 'Gwardia idzie naprzód',
      mood: 'dramatic',
      duration: 65,
      perspective: 'narrator',
      text: 'Po południu Napoleon rzucił na szalę Starą Gwardię — elitę armii, niezwyciężoną przez szesnaście lat kampanii. Pięć batalionów w bearskin czapkach maszerowało pod wzgórze spokojnym krokiem. Wellington ukrył swoich żołnierzy za grzbietem wzgórza. Kiedy Gwardia znalazła się w zasięgu, Anglicy wstali i dali ognia. Gwardia zachwiała się po raz pierwszy w historii. Gdy plotka La Garde recule przetoczyła się przez linię francuską, panika stała się powszechna.',
    },
    {
      id: 'waterloo-1815-scene-3',
      title: 'Zmierzch cesarstwa',
      mood: 'melancholic',
      duration: 58,
      perspective: 'narrator',
      text: 'O siódmej wieczór Blücher uderzył na prawe skrzydło Francuzów. Armia napoleońska rozpadła się. Napoleon uciekał w powozie, który porzucił i dosiadł konia. Za nim uciekały resztki jego świata. Trzy tygodnie później podpisał drugą abdykację. Wysłano go na Wyspę Świętej Heleny, z której już nigdy nie wrócił. Waterloo nie było tylko bitwą — to był koniec epoki, w której jeden człowiek próbował zamienić Europę w swój sen.',
    },
  ],

  /* ═══════════════════════ I WOJNA ŚWIATOWA ═══════════════════ */

  'ypres-1914': [
    {
      id: 'ypres-1914-scene-1',
      title: 'Błoto Flandrii',
      mood: 'atmospheric',
      duration: 52,
      perspective: 'narrator',
      text: 'Październik 1914. Miasto Ypres w belgijskiej Flandrii. Armie obu stron wyścigiem ku morzu usiłowały okrążyć się wzajemnie — bez skutku. Linia frontu skrzepła w sieć okopów. Deszcz flamandzki nie ustaje. Gleba jest ilasta, okopy zalewają się wodą do kolan. Żołnierze stają w błocie, jedzą w błocie i w błocie umierają. Ypres stało się symbolem bez żadnego strategicznego sensu — tylko symbolem tego, czym ta wojna jest.',
    },
    {
      id: 'ypres-1914-scene-2',
      title: 'Ochotnicza śmierć',
      mood: 'dramatic',
      duration: 60,
      perspective: 'narrator',
      text: 'Niemcy rzucili do boju nowe dywizje złożone ze studentów-ochotników, którzy ledwo skończyli szkolenie. Historiografia nazywa to Kindermord — rzeź niewiniatek pod Ypres. Tysiące młodych Niemców szło przez otwarte pole śpiewając hymn, wprost na brytyjski ogień karabinowy. Polegli masowo. W jednym pułku w ciągu trzech tygodni zabito lub raniono ponad siedemdziesiąt procent stanu. Z obu stron ginęli ludzie, którzy myśleli, że ta война potrwa kilka tygodni.',
    },
    {
      id: 'ypres-1914-scene-3',
      title: 'Trzymać linię',
      mood: 'heroic',
      duration: 55,
      perspective: 'narrator',
      text: 'Kiedy listopadowy mróz zastopował walki, linia frontu była prawie niezmieniona. Ypres zostało utrzymane. Ale miasto zamieniło się w ruiny. Żołnierze kopali okopy głębiej, budowali baraki z desek, grali na harmonijkach. Na Boże Narodzenie 1914 po obu stronach drutu wyjdą z okopów, by przez kilka godzin zachowywać się po ludzku. Ten moment nie wróci — ale będą go pamiętać do końca życia, zarówno wróg, jak i przyjaciel.',
    },
  ],

  'verdun-1916': [
    {
      id: 'verdun-1916-scene-1',
      title: 'Piekło na ziemi',
      mood: 'brutal',
      duration: 55,
      perspective: 'narrator',
      text: 'Luty 1916. Niemcy uderzyli na Verdun z siłą nigdy wcześniej niewidzianą — tysiąc dwa armaty na odcinku ośmiu kilometrów. Ziemia dosłownie znikała. Drzewa, bunkry, okopy — wszystko zamieniało się w parujący gruz. Erich von Falkenhayn napisał w memorandum do cesarza, że chce wykrwawić Francję — dosłownie. Verdun miało być maszyną do mielenia żołnierzy. I taką się stało — dla obu stron.',
    },
    {
      id: 'verdun-1916-scene-2',
      title: 'Święta Droga',
      mood: 'desperate',
      duration: 62,
      perspective: 'narrator',
      text: 'Przez dziesięć miesięcy bitwy przewinęły się prawie wszystkie dywizje armii francuskiej. Jedyna droga zaopatrzenia wiodła przez Bar-le-Duc — ponad trzy tysiące ciężarówek tygodniowo zawoziło ludzi, amunicję, jedzenie. Nazywano ją Voie Sacrée, Świętą Drogą. Ludzie szli na nią jak skazańcy. Co kilkadziesiąt metrów stał żandarm popędzający kierowców — ciężarówki nie mogły zatrzymywać się nawet na chwilę.',
    },
    {
      id: 'verdun-1916-scene-3',
      title: 'Cena centymetra',
      mood: 'melancholic',
      duration: 60,
      perspective: 'narrator',
      text: 'Pod koniec 1916 roku linia frontu pod Verdun znajdowała się prawie dokładnie tam, gdzie była w lutym. Dziesięć miesięcy, trzysta tysięcy zabitych i zaginionych — za nic. Pewne obszary zostały zbombardowane tak intensywnie, że do dziś strefy czerwone pod Verdun pozostają wyłączone z użytkowania — ziemia jest zatruta arsenem z niewybuchy. Krajobraz wciąż nosi ślady tamtej bitwy: tysiące lejów po bombach. Verdun nie skończyło się w 1916. Trwa wiecznie w tej ziemi.',
    },
  ],

  'somme-1916': [
    {
      id: 'somme-1916-scene-1',
      title: 'Godzina zero',
      mood: 'tense',
      duration: 55,
      perspective: 'narrator',
      text: 'Pierwszego lipca 1916, godzina siódma dwadzieścia rano. Sto tysięcy żołnierzy brytyjskich czeka w okopach wzdłuż rzeki Sommy. Przez tydzień artyleria aliancka bombardowała pozycje niemieckie, zużywając półtora miliona pocisków. Dowódcy byli pewni: po takim ostrzale Niemcy będą sparaliżowani. O siódmej trzydzieści zagrały gwizdki sierżantów. Żołnierze weszli po drabinach i wyszli na otwarte pole.',
    },
    {
      id: 'somme-1916-scene-2',
      title: 'Najczarniejszy dzień',
      mood: 'brutal',
      duration: 68,
      perspective: 'narrator',
      text: 'Niemcy przeżyli bombardowanie w głęboko wydrążonych bunkrach betonowych. Kiedy gwizdki zagrały, wybiegli z karabinami maszynowymi i czekali. Brytyjczycy szli powolnym krokiem przez sto metrów ziemi niczyjej — tak nakazywała taktyka. Niemieccy karabinierzy otworzyli ogień. Pierwsze linie padały jak ścięte zboże. Pułki traciły połowę stanu w ciągu dwudziestu minut. Do końca pierwszego dnia Brytyjczycy stracili blisko sześćdziesiąt tysięcy ludzi. Był to najgorszy dzień w historii armii brytyjskiej.',
    },
    {
      id: 'somme-1916-scene-3',
      title: 'Nauka w krwi',
      mood: 'melancholic',
      duration: 58,
      perspective: 'narrator',
      text: 'Bitwa nad Sommą trwała do listopada 1916. Linia frontu przesunęła się o kilka do dwudziestu kilometrów, kosztując milion sto tysięcy ofiar po obu stronach. Na Sommie po raz pierwszy użyto czołgów. Tu opracowano taktykę małych grup szturmowych i zasłon ogniowych. Dwa lata później Brytyjczycy będą używać tych metod, by rozbić armię cesarską. Ale za tę naukę zapłacili krwią niewyobrażalnie wysoką cenę.',
    },
  ],

  'marne-1914': [
    {
      id: 'marne-1914-scene-1',
      title: 'Niemcy u bram Paryża',
      mood: 'dramatic',
      duration: 55,
      perspective: 'narrator',
      text: 'Wrzesień 1914. Niemcy realizują Plan Schlieffena. W trzy tygodnie od wypowiedzenia wojny są czterdzieści kilometrów od Paryża. Rząd francuski ewakuował się do Bordeaux. Paryżanie uciekają tysiącami na południe. Ale niemieccy dowódcy popełnili błąd: I Armia skręciła za wcześnie na wschód zamiast obejść Paryż od zachodu. Przez tę szczelinę generał Joffre zamierzał wbić klin i odwrócić losy kampanii.',
    },
    {
      id: 'marne-1914-scene-2',
      title: 'Taksówki Paryża',
      mood: 'atmospheric',
      duration: 58,
      perspective: 'narrator',
      text: 'Szósty września 1914. Joffre wydał rozkaz kontrataku. Jedna z dywizji nie miała jak dotrzeć na front w czasie — brak wagonów. Gubernator wojskowy Paryża, Galliéni, kazał rekwirować wszystkie taksówki w mieście — sześćset Renault AG. Trzy tysiące żołnierzy w dwóch turach pojechało taksówkami na front. Liczba była skromna, ale gest gigantyczny. Paryż walczył o siebie własnymi środkami. Taksówki Marny stały się legendą.',
    },
    {
      id: 'marne-1914-scene-3',
      title: 'Cud nad Marną',
      mood: 'triumphant',
      duration: 58,
      perspective: 'narrator',
      text: 'Przez pięć dni w dolinie Marny toczyły się najzacieklejsze walki. Niemcy, widząc zagrożenie swojej flanki, wycofali się i zaczęli kopać okopy. Paryż był uratowany. Francja nie padła w sześć tygodni jak zakładał Plan Schlieffena. Pierwsza Bitwa nad Marną przekształciła wojnę błyskawiczną w wojnę pozycyjną — tę, która przez cztery lata będzie mordować młodych Europejczyków w okopach. Ale też dała Aliantom szansę na ostateczne zwycięstwo.',
    },
  ],

  /* ═══════════════════════ II WOJNA ŚWIATOWA ══════════════════ */

  'britain-1940': [
    {
      id: 'britain-1940-scene-1',
      title: 'Bitwa o niebo',
      mood: 'tense',
      duration: 55,
      perspective: 'narrator',
      text: 'Lato 1940. Francja upadła. Niemcy stoją na wybrzeżach Kanału La Manche i patrzą na białe klify Anglii. Hitler wydał rozkaz: Operacja Lew Morski. Warunek: Luftwaffe musi najpierw zniszczyć RAF. Göring obiecał to w dwa tygodnie. Stawką była nie tylko Anglia — jeśli Wielka Brytania padnie, nie ma bazy dla kontrataku, nie ma nadziei dla podbitej Europy. Kilkuset pilotów wzięło na siebie ciężar zachodniej cywilizacji.',
    },
    {
      id: 'britain-1940-scene-2',
      title: 'Scramble!',
      mood: 'dramatic',
      duration: 62,
      perspective: 'narrator',
      text: 'Kilka razy dziennie syreny przerywały ciszę lotnisk. Scramble — start alarmowy. Piloci biegli do Spitfire\'ów i Hurricane\'ów, w ciągu minut byli już w powietrzu naprzeciwko formacji liczących po dwieście samolotów. Niemcy mieli przewagę liczebną i techniczną. Anglicy mieli radar i znajomość własnego terenu. Każdy zestrzelony Spitfire tracił się bezpowrotnie. Każdy zestrzelony Niemiec lądował nad angielską ziemią lub w angielskim kanale. Piloci RAF żyli statystycznie mniej niż cztery tygodnie.',
    },
    {
      id: 'britain-1940-scene-3',
      title: 'Nigdy tak wielu',
      mood: 'heroic',
      duration: 58,
      perspective: 'narrator',
      text: 'Göring zmienił taktykę — zamiast lotnisk zaczął bombardować Londyn. To błąd, który uratował RAF. Lotniska zdążyły się odrodzić. We wrześniu 1940 Niemcy stracili pięćdziesiąt osiem samolotów w jednym dniu i uznali masowe ataki dzienne za zbyt kosztowne. Operacja Lew Morski zostaje odwołana. Churchill przemówił: Nigdy w historii ludzkich konfliktów tak wielu nie zawdzięczało tak wiele tak nielicznym. Wśród tych nielicznych było ponad trzystu polskich pilotów.',
    },
  ],

  'stalingrad-1942': [
    {
      id: 'stalingrad-1942-scene-1',
      title: 'Miasto ruin',
      mood: 'atmospheric',
      duration: 55,
      perspective: 'narrator',
      text: 'Sierpień 1942. Miasto noszące imię Stalina nad Wołgą. Luftwaffe zbombardowało je tak dokładnie, że w jedną noc zginęło pięćdziesiąt tysięcy cywilów. Potem nadeszła armia. Niemcy, przekonani że kilka dni wystarczy, wpadli w labirynt ruin zmieniający reguły walki. W każdym murze siedział radziecki snajper. W każdej piwnicy kryli się żołnierze gotowi walczyć na śmierć. Dla obu stron Stalingrad stał się obsesją.',
    },
    {
      id: 'stalingrad-1942-scene-2',
      title: 'Walka dom po domu',
      mood: 'desperate',
      duration: 65,
      perspective: 'narrator',
      text: 'Generał Czujkow opisał taktykę jednym zdaniem: ściskaj Niemca jak w uścisku. Im bliżej wroga, tym bezpieczniej — artyleria nie strzela do swoich. W Stalingradzie walczono o piętro, klatkę schodową, pojedynczy pokój. Dom Pawłowa utrzymało kilkudziesięciu żołnierzy przez pięćdziesiąt osiem dni. Niemcy stracili pod nim więcej ludzi niż przy zdobywaniu Paryża. Codziennie nocami przez Wołgę płynęły łodzie z amunicją pod ogniem artylerii.',
    },
    {
      id: 'stalingrad-1942-scene-3',
      title: 'Kocioł',
      mood: 'dramatic',
      duration: 62,
      perspective: 'narrator',
      text: 'W listopadzie 1942 Żukow uruchomił Operację Uran. Armie radzieckie uderzyły na słabsze rumuńskie i włoskie flanki. W trzy doby okrążono trzysta trzydzieści tysięcy żołnierzy Szóstej Armii Paulusa. Hitler zakazał przebijania się. Powietrzny most zaopatrzenia okazał się złudzeniem. Drugiego lutego 1943 ostatnie jednostki złożyły broń. To był punkt zwrotny całej войны — pierwsza wielka ofensywna klęska Niemiec. Zachód wiedział, że Wehrmacht może przegrać.',
    },
  ],

  'kursk-1943': [
    {
      id: 'kursk-1943-scene-1',
      title: 'Stalowe przygotowania',
      mood: 'strategic',
      duration: 55,
      perspective: 'narrator',
      text: 'Lipiec 1943. Przy Kursku powstało ogromne wybrzuszenie frontu, łuk o średnicy dwustu kilometrów wciśnięty w linie niemieckie. Hitler chciał ściąć ten łuk kleszczykami dwóch grup armii. Żukow przeczytał ich plany — przez wywiad. Zamiast atakować, zbudował siedem linii obrony na osiemdziesiąt kilometrów w głąb. Ponad milion min, tysiące dział przeciwpancernych, pięć tysięcy czołgów. Obie strony wiedziały, że decyzyjna operacja pancerna jest nieuchronna.',
    },
    {
      id: 'kursk-1943-scene-2',
      title: 'Starcie stali',
      mood: 'brutal',
      duration: 65,
      perspective: 'narrator',
      text: 'Piątego lipca 1943 Niemcy ruszyli do ataku. Radziecka artyleria otworzyła ogień kilka minut wcześniej — znali dokładną godzinę. Tygrysy i Pantery przebijały się przez linie obrony, ale każda linia kosztowała je coraz więcej. Pod Prochorowką doszło do największej bitwy pancernej w historii — kilkaset czołgów z każdej strony starło się na otwartym polu w chmurach pyłu i dymu. Niemcy nie zdołali przebić się do tyłu radzieckich linii.',
    },
    {
      id: 'kursk-1943-scene-3',
      title: 'Koniec inicjatywy',
      mood: 'dramatic',
      duration: 58,
      perspective: 'narrator',
      text: 'Po Kursku Wehrmacht nigdy już nie przeprowadził strategicznej ofensywy na Wschodzie. Inicjatywa strategiczna przeszła definitywnie w ręce Armii Czerwonej. Niemcy wciąż walczyli twardo — jeszcze dwa lata — ale od tej pory tylko się cofali. Żukow, który jako jedyny radziecki dowódca planował obronę strategiczną zamiast ataku, miał rację. Cierpliwość wygrała z impetem. Głęboka obrona wygrała z pancernym klinem.',
    },
  ],

  'normandy-1944': [
    {
      id: 'normandy-1944-scene-1',
      title: 'Szare brzegi',
      mood: 'tense',
      duration: 55,
      perspective: 'narrator',
      text: 'Szósty czerwca 1944, godzina piąta rano. W Kanale La Manche płynie pięć tysięcy okrętów — największa flota inwazji w historii. Na pokładach sto pięćdziesiąt siedem tysięcy żołnierzy czeka na sygnał. Niemcy wiedzą, że inwazja nadejdzie — ale nie gdzie i nie kiedy. Aliancki wywiad podtrzymał fałszywe przekonanie, że główny cios padnie na Pas de Calais. Eisenhower napisał przemówienie na wypadek klęski. Leżało w kieszeni.',
    },
    {
      id: 'normandy-1944-scene-2',
      title: 'Przez ogień',
      mood: 'brutal',
      duration: 65,
      perspective: 'narrator',
      text: 'Na plaży Omaha było najgorzej. Niemieccy obrońcy zdziesiątkowali pierwsze fale desantu. Żołnierze wyskakiwali z barek na głębokiej wodzie, tonęli pod ciężarem sprzętu. Ci, którzy dotarli do plaży, kryli się za stalowymi jeżami. Generał Bradley rozważał ewakuację Omaha Beach. O dziesiątej rano grupki żołnierzy zaczęły wspinać się na klify. Sierżant czy kapral — nie generał — podejmował decyzję. Do wieczora Alianci mieli przyczółek.',
    },
    {
      id: 'normandy-1944-scene-3',
      title: 'Cena wolności',
      mood: 'heroic',
      duration: 58,
      perspective: 'narrator',
      text: 'Do zmierzchu szóstego czerwca sto pięćdziesiąt siedem tysięcy żołnierzy alianckich wylądowało we Francji, tracąc od czterech do dziesięciu tysięcy zabitych i rannych. Normandia była początkiem końca — za nią szła Francja, Belgia, Holandia, Niemcy. Do Berlina było jeszcze jedenaście miesięcy krwawej walki. Na cmentarzu Colleville-sur-Mer leży dziewięć tysięcy trzysta osiemdziesiąt sześć Amerykanów. Ich grób patrzy ku morzu, zza którego przypłynęli.',
    },
  ],

  'berlin-1945': [
    {
      id: 'berlin-1945-scene-1',
      title: 'Ostatnia twierdza',
      mood: 'atmospheric',
      duration: 52,
      perspective: 'narrator',
      text: 'Kwiecień 1945. Berlin jest miastem bez nadziei. Alianci są sto kilometrów na zachód, Armia Czerwona — dwadzieścia na wschód. Hitler siedzi w bunkrze głęboko pod Nową Kancelarią i wydaje rozkazy armiom, które już nie istnieją. Do obrony miasta wyznaczono sto tysięcy żołnierzy, w tym Volkssturm — piętnastolatków i pięćdziesięciolatków z Panzerfaustami. Marszałkowie Żukow i Koniew ścigają się o zaszczyt zdobycia Berlina.',
    },
    {
      id: 'berlin-1945-scene-2',
      title: 'Radziecka lawina',
      mood: 'brutal',
      duration: 62,
      perspective: 'narrator',
      text: 'Szesnastego kwietnia Armia Czerwona ruszyła do szturmu. Wzgórza Seelów broniły się trzy doby. Żukow rzucił tysiąc pięćset czołgów na kilkunastokilometrowym pasie. Ogień artylerii słyszano sto kilometrów dalej. Dwudziestego pierwszego kwietnia pierwsze sowieckie jednostki weszły do Berlina. Walka toczyła się o każdy budynek, każde skrzyżowanie, każdą stację metra. Berlin płonął.',
    },
    {
      id: 'berlin-1945-scene-3',
      title: 'Koniec epoki',
      mood: 'melancholic',
      duration: 60,
      perspective: 'narrator',
      text: 'Trzydziestego kwietnia 1945 Adolf Hitler zastrzelił się w bunkrze. Dwa dni później Berlin się poddał. Ósmy maja — kapitulacja Rzeszy. Sześć lat, osiemdziesiąt pięć milionów ofiar, Holocaust. Wszystko to skończyło się przy Reichstagu, nad którym sowieccy żołnierze zatknęli czerwony sztandar. Zdjęcie obiegło świat. Berlin w 1945 to były ruiny — osiemdziesiąt procent miasta zniszczone. W tych ruinach zaczęło się budować coś nowego. Europa powoli uczyła się żyć bez wojny.',
    },
  ],

  'gettysburg-1863': [
    {
      id: 'gettysburg-1863-scene-1',
      title: 'Wzgórza Pensylwanii',
      mood: 'tense',
      duration: 52,
      perspective: 'narrator',
      text: 'Pierwsze dni lipca 1863 roku. Armia Konfederacji generała Lee wkroczyła na Północ w poszukiwaniu decydującego starcia. Pod miasteczkiem Gettysburg obie armie natknęły się na siebie przez przypadek. Przez trzy dni rozstrzygał się los Stanów Zjednoczonych. Jeśli Lee rozbieje Armię Potomaku tu, na Północy, Kongres może zmusić Lincolna do rozmów pokojowych — co oznaczałoby dwa narody, z których jeden oparty jest na niewolnictwie.',
    },
    {
      id: 'gettysburg-1863-scene-2',
      title: 'Szarża Picketta',
      mood: 'dramatic',
      duration: 65,
      perspective: 'narrator',
      text: 'Trzeci dzień bitwy. Lee zdecydował się na bezpośredni atak centrum Unii. Generał Pickett poprowadził trzynaście tysięcy żołnierzy przez otwarte pole pod ogniem artylerii i karabinów. Żołnierze w szarych mundurach szli spokojnym krokiem przez trawę między eksplodującymi pociskami. Ci, którzy dotarli do muru z kamienia — Wysoka Woda Konfederacji — zostali zepchnięci z powrotem. Mniej niż połowa wróciła. Lee, patrząc na powracające resztki, powiedział: To moja wina.',
    },
    {
      id: 'gettysburg-1863-scene-3',
      title: 'Poświęcone ziemie',
      mood: 'melancholic',
      duration: 58,
      perspective: 'narrator',
      text: 'Po trzech dniach walk Lee wycofał się do Wirginii. Obie strony straciły łącznie ponad pięćdziesiąt tysięcy zabitych, rannych i zaginionych. Pięć miesięcy później Lincoln stanął na tym polu i wygłosił przemówienie, które trwa cztery minuty, a przetrwało wieki: Nie możemy uświęcić tej ziemi — uświęcili ją ci, którzy tu walczyli. Gettysburg był punktem zwrotnym — Konfederacja nigdy już nie zagroziła Północy.',
    },
  ],

};

// ════════════════════════════════════════════════════════════
// LAZY REQUIRE — Firebase SDK
// Ładujemy dopiero przy pierwszym użyciu.
// Jeśli SDK nie jest dostępne (Expo Go, stary RN) → null → fallback.
// ════════════════════════════════════════════════════════════
interface FirebaseModules {
  initializeApp: any;
  getApps:        any;
  getFirestore:   any;
  collection:     any;
  doc:            any;
  getDoc:         any;
  getDocs:        any;
  setDoc:         any;
  writeBatch:     any;
  query:          any;
  orderBy:        any;
  limit:          any;
}

let _fb: FirebaseModules | null | 'loading' = 'loading';

function getFirebaseModules(): FirebaseModules | null {
  if (_fb !== 'loading') return _fb;
  try {
    const app   = require('firebase/app');
    const store = require('firebase/firestore');
    _fb = {
      initializeApp: app.initializeApp,
      getApps:       app.getApps,
      getFirestore:  store.getFirestore,
      collection:    store.collection,
      doc:           store.doc,
      getDoc:        store.getDoc,
      getDocs:       store.getDocs,
      setDoc:        store.setDoc,
      writeBatch:    store.writeBatch,
      query:         store.query,
      orderBy:       store.orderBy,
      limit:         store.limit,
    };
    if (__DEV__) console.log('[Firebase] SDK załadowany pomyślnie');
    return _fb;
  } catch (e) {
    console.warn('[Firebase] SDK niedostępny — tryb offline:', e);
    _fb = null;
    return null;
  }
}

// ── Inicjalizuj Firebase i zwróć instancję Firestore ──────────
function getFirebase(): { db: any; fb: FirebaseModules } | null {
  if (!FIREBASE_CONFIG.projectId) return null;
  const fb = getFirebaseModules();
  if (!fb) return null;
  try {
    const app = fb.getApps().length ? fb.getApps()[0] : fb.initializeApp(FIREBASE_CONFIG);
    const db  = fb.getFirestore(app);
    return { db, fb };
  } catch (e) {
    console.warn('[Firebase] Błąd inicjalizacji Firestore:', e);
    return null;
  }
}

// ── AsyncStorage cache ────────────────────────────────────────
async function readCache(): Promise<Battle[] | null> {
  try {
    const [tsRaw, dataRaw] = await Promise.all([
      AsyncStorage.getItem(CACHE_TS_KEY),
      AsyncStorage.getItem(CACHE_KEY),
    ]);
    if (!tsRaw || !dataRaw) return null;
    if (Date.now() - parseInt(tsRaw, 10) > CACHE_TTL) return null;
    return JSON.parse(dataRaw) as Battle[];
  } catch {
    return null;
  }
}

async function writeCache(battles: Battle[]): Promise<void> {
  try {
    await Promise.all([
      AsyncStorage.setItem(CACHE_KEY, JSON.stringify(battles)),
      AsyncStorage.setItem(CACHE_TS_KEY, Date.now().toString()),
    ]);
  } catch {}
}

// ── Auto-seed Firestore ───────────────────────────────────────
async function seedIfEmpty(db: any, fb: FirebaseModules): Promise<void> {
  try {
    const snap = await fb.getDocs(fb.collection(db, 'battles'));
    if (!snap.empty) return;

    if (__DEV__) console.log('[Firebase] Seeding battles...');
    const batch = fb.writeBatch(db);
    for (const b of SEED_BATTLES) {
      batch.set(fb.doc(db, 'battles', b.id), b);
    }
    await batch.commit();
    if (__DEV__) console.log('[Firebase] Seed OK');
  } catch (e) {
    console.warn('[Firebase] Seed failed:', e);
  }
}

// ════════════════════════════════════════════════════════════
// PUBLIC API
// ════════════════════════════════════════════════════════════

export async function getBattles(eraFilter?: string): Promise<Battle[]> {
  const firebase = getFirebase();

  // Brak SDK lub brak konfiguracji — zwróć seed data
  if (!firebase) {
    const base   = eraFilter ? SEED_BATTLES.filter(b => b.era === eraFilter) : [...SEED_BATTLES];
    const result = applyLocalImages(base);
    if (__DEV__) console.log(`[Firebase] Offline — ${result.length} bitew z seed data`);
    return result;
  }

  const { db, fb } = firebase;

  // Cache hit — odśwież imageUrl z lokalnej mapy (nowe URL-e po Fast Refresh)
  const cached = await readCache();
  if (cached) {
    const withImages = applyLocalImages(cached);
    const result = eraFilter ? withImages.filter(b => b.era === eraFilter) : withImages;
    if (__DEV__) console.log(`[Firebase] Cache: ${result.length} bitew`);
    return result;
  }

  // Firestore
  try {
    await seedIfEmpty(db, fb);

    const snap    = await fb.getDocs(fb.collection(db, 'battles'));
    const battles = snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as Battle));
    const raw     = battles.length > 0 ? battles : [...SEED_BATTLES];
    const all     = applyLocalImages(raw); // zawsze nadpisz imageUrl lokalną mapą

    await writeCache(all);

    const result = eraFilter ? all.filter((b: Battle) => b.era === eraFilter) : all;
    if (__DEV__) console.log(`[Firebase] Firestore: ${result.length} bitew`);
    return result;
  } catch (e) {
    console.warn('[Firebase] getBattles error:', e);
    const base   = eraFilter ? SEED_BATTLES.filter(b => b.era === eraFilter) : [...SEED_BATTLES];
    return applyLocalImages(base);
  }
}

export async function getBattleById(id: string): Promise<FullBattle | null> {
  // Helper: dołącz mock sceny gdy Firestore nie dostarczył żadnych.
  const withScenes = (battle: FullBattle): FullBattle => {
    if (!battle.scenes || battle.scenes.length === 0) {
      const mock = MOCK_SCENES[id];
      if (mock && mock.length > 0) {
        if (__DEV__) console.log(`[Firebase] Injecting ${mock.length} mock scenes for "${id}"`);
        return { ...battle, scenes: mock };
      }
    }
    return battle;
  };

  // Zawsze próbuj Firestore (pełne dane ze scenes)
  const firebase = getFirebase();
  if (firebase) {
    const { db, fb } = firebase;
    try {
      const snap = await fb.getDoc(fb.doc(db, 'battles', id));
      if (snap.exists()) {
        const battle = { id: snap.id, ...snap.data() } as FullBattle;
        // Zawsze nadpisz imageUrl lokalną mapą (spójne 800px URL-e)
        return withScenes({ ...battle, imageUrl: LOCAL_IMAGE_URLS[id] ?? battle.imageUrl });
      }
    } catch (e) {
      console.warn('[Firebase] getBattleById error:', e);
    }
  }

  // Fallback: lista-cache (bez scenes, ale przynajmniej dane podstawowe)
  const cached = await readCache();
  if (cached) {
    const found = cached.find(b => b.id === id);
    // Cache był zapisany przez getBattles() z applyLocalImages — imageUrl jest już ustawiony
    if (found) return withScenes({ ...found, imageUrl: LOCAL_IMAGE_URLS[id] ?? found.imageUrl } as FullBattle);
  }

  // Ostateczny fallback: seed data
  const seed = SEED_BATTLES.find(b => b.id === id);
  if (seed) return withScenes({ ...seed, imageUrl: LOCAL_IMAGE_URLS[id] ?? seed.imageUrl } as FullBattle);
  return null;
}

export async function getUserProgress(userId: string): Promise<User | null> {
  const firebase = getFirebase();
  if (!firebase) return null;

  const { db, fb } = firebase;
  try {
    const snap = await fb.getDoc(fb.doc(db, 'users', userId));
    if (!snap.exists()) return null;
    return snap.data() as User;
  } catch (e) {
    console.warn('[Firebase] getUserProgress error:', e);
    return null;
  }
}

export async function saveUserProgress(userId: string, user: User): Promise<void> {
  const firebase = getFirebase();
  if (!firebase) return;

  const { db, fb } = firebase;
  try {
    await fb.setDoc(fb.doc(db, 'users', userId), user, { merge: true });
  } catch (e) {
    console.warn('[Firebase] saveUserProgress error:', e);
  }
}

// ── Leaderboard ─────────────────────────────────────────────────
export interface LeaderboardEntry {
  userId: string;
  name: string;
  totalXP: number;
  level: number;
  streak: number;
  weeklyXP: number;
  updatedAt: string; // ISO date
}

/**
 * Oblicz weeklyXP na podstawie activityLog użytkownika.
 * Sumuje aktywności z ostatnich 7 dni × 100 XP za sesję.
 */
function computeWeeklyXP(activityLog: Record<string, number>): number {
  const now   = new Date();
  let total   = 0;
  for (let i = 0; i < 7; i++) {
    const d   = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    total += activityLog[key] ?? 0;
  }
  return total * 100;
}

/**
 * Upsert leaderboard entry for current user.
 * Called from saveToStorage after each progress save.
 */
export async function updateLeaderboardEntry(user: User): Promise<void> {
  const firebase = getFirebase();
  if (!firebase) return;

  const { db, fb } = firebase;
  try {
    const { levelFromXP } = require('../store');
    const weeklyXP = computeWeeklyXP(user.activityLog ?? {});
    const entry: LeaderboardEntry = {
      userId:    user.id,
      name:      user.name,
      totalXP:   user.totalXP,
      level:     levelFromXP(user.totalXP).level,
      streak:    user.streak,
      weeklyXP,
      updatedAt: new Date().toISOString(),
    };
    await fb.setDoc(fb.doc(db, 'leaderboard', user.id), entry, { merge: true });
  } catch (e) {
    console.warn('[Firebase] updateLeaderboardEntry error:', e);
  }
}

/**
 * Fetch top N players, sorted by totalXP (all-time) or weeklyXP (weekly).
 */
export async function getLeaderboard(
  mode: 'weekly' | 'alltime',
  maxResults: number = 50,
): Promise<LeaderboardEntry[]> {
  const firebase = getFirebase();
  if (!firebase) return [];

  const { db, fb } = firebase;
  try {
    const field = mode === 'weekly' ? 'weeklyXP' : 'totalXP';
    const q     = fb.query(
      fb.collection(db, 'leaderboard'),
      fb.orderBy(field, 'desc'),
      fb.limit(maxResults),
    );
    const snap  = await fb.getDocs(q);
    return snap.docs.map((d: any) => d.data() as LeaderboardEntry);
  } catch (e) {
    console.warn('[Firebase] getLeaderboard error:', e);
    return [];
  }
}

export async function invalidateBattlesCache(): Promise<void> {
  try {
    await Promise.all([
      AsyncStorage.removeItem(CACHE_KEY),
      AsyncStorage.removeItem(CACHE_TS_KEY),
      // Wyczyść stare klucze v1/v2/v3
      AsyncStorage.removeItem('be_battles_v1'),
      AsyncStorage.removeItem('be_battles_ts_v1'),
      AsyncStorage.removeItem('be_battles_v2'),
      AsyncStorage.removeItem('be_battles_ts_v2'),
      AsyncStorage.removeItem('be_battles_v3'),
      AsyncStorage.removeItem('be_battles_ts_v3'),
    ]);
  } catch {}
}
