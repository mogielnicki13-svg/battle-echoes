// ============================================================
// BATTLE ECHOES — quizData.ts
// 5 pytań na bitwę — historia, taktyka, dowódcy, wynik
// ============================================================

export interface QuizQuestion {
  question:    string;
  options:     [string, string, string, string];
  correct:     0 | 1 | 2 | 3;
  explanation: string;
}

export const QUIZ_DATA: Record<string, QuizQuestion[]> = {

  // ══════════════════════════════════════════════════════════
  // GRUNWALD 1410
  // ══════════════════════════════════════════════════════════
  'grunwald-1410': [
    {
      question: 'W którym roku odbyła się Bitwa pod Grunwaldem?',
      options: ['1400', '1410', '1415', '1422'],
      correct: 1,
      explanation: 'Bitwa pod Grunwaldem odbyła się 15 lipca 1410 roku — jedna z największych bitew średniowiecznej Europy.',
    },
    {
      question: 'Kto dowodził wojskami polsko-litewskimi pod Grunwaldem?',
      options: ['Jan III Sobieski', 'Bolesław Chrobry', 'Władysław II Jagiełło', 'Kazimierz Wielki'],
      correct: 2,
      explanation: 'Władysław II Jagiełło, król Polski, dowodził połączonymi siłami polsko-litewskimi. Wielki Książę Witold prowadził Litwinów.',
    },
    {
      question: 'Który zakon rycerski poniósł klęskę pod Grunwaldem?',
      options: ['Zakon Templariuszy', 'Zakon Joannitów', 'Zakon Kalatrawski', 'Zakon Krzyżacki'],
      correct: 3,
      explanation: 'Zakon Krzyżacki (Teutonów) poniósł druzgocącą klęskę. Wielki Mistrz Ulrich von Jungingen zginął na polu bitwy.',
    },
    {
      question: 'Ile chorągwi wystawiły łącznie wojska polsko-litewskie?',
      options: ['22', '31', '39', '51'],
      correct: 2,
      explanation: '39 chorągwi polsko-litewskich stanęło do walki, tworząc armię liczącą ok. 39 000 żołnierzy.',
    },
    {
      question: 'Jaki był bezpośredni wynik Bitwy pod Grunwaldem?',
      options: [
        'Zakon Krzyżacki zdobył Kraków',
        'Polska i Litwa zawarły pokój z Krzyżakami bez walki',
        'Zwycięstwo Królestwa Polskiego i Litwy',
        'Remis i podzielenie ziem Zakonu',
      ],
      correct: 2,
      explanation: 'Polska i Litwa odniosły całkowite zwycięstwo. Zakon nigdy w pełni nie odbudował swojej potęgi militarnej.',
    },
  ],

  // ══════════════════════════════════════════════════════════
  // YPRES 1914
  // ══════════════════════════════════════════════════════════
  'ypres-1914': [
    {
      question: 'W jakim miesiącu 1914 roku toczyła się Pierwsza Bitwa pod Ypres?',
      options: ['Sierpień–Wrzesień', 'Wrzesień–Październik', 'Październik–Listopad', 'Listopad–Grudzień'],
      correct: 2,
      explanation: 'Pierwsza Bitwa pod Ypres trwała od października do listopada 1914 r. — ostatnie wielkie starcie manewrowe na froncie zachodnim.',
    },
    {
      question: 'Kto dowodził brytyjskim korpusem ekspedycyjnym pod Ypres?',
      options: ['Douglas Haig', 'John French', 'Kitchener', 'Allenby'],
      correct: 1,
      explanation: 'Marszałek polny John French dowodził Brytyjskim Korpusem Ekspedycyjnym (BEF) podczas Pierwszej Bitwy pod Ypres.',
    },
    {
      question: 'Który kraj atakował Ypres, chcąc przebić się do portów La Manche?',
      options: ['Austria-Węgry', 'Imperium Osmańskie', 'Cesarstwo Niemieckie', 'Bułgaria'],
      correct: 2,
      explanation: 'Cesarstwo Niemieckie chciało przejąć porty La Manche i odciąć Wielką Brytanię od dostaw. Plan nie powiódł się pod Ypres.',
    },
    {
      question: 'Jakie strategiczne znaczenie miało miasto Ypres dla Ententy?',
      options: [
        'Było stolicą Belgii',
        'Kontrolowało drogi do portów Kanału La Manche',
        'Chroniło Paryż od północy',
        'Było centrum produkcji broni',
      ],
      correct: 1,
      explanation: 'Utrata Ypres oznaczałaby kontrolę Niemiec nad portami w Calais i Dunkierce, odcinając linie zaopatrzenia BEF.',
    },
    {
      question: 'Jaki był wynik Pierwszej Bitwy pod Ypres?',
      options: [
        'Niemcy zajęli Ypres',
        'Alianci utrzymali miasto Ypres',
        'Zawarty rozejm bez rozstrzygnięcia',
        'Belgia poddała się',
      ],
      correct: 1,
      explanation: 'Alianci bohatersko utrzymali Ypres, lecz obie strony poniosły ogromne straty — ok. 250 000 zabitych i rannych łącznie.',
    },
  ],

  // ══════════════════════════════════════════════════════════
  // WATERLOO 1815
  // ══════════════════════════════════════════════════════════
  'waterloo-1815': [
    {
      question: 'W którym roku odbyła się Bitwa pod Waterloo?',
      options: ['1812', '1813', '1814', '1815'],
      correct: 3,
      explanation: 'Bitwa pod Waterloo odbyła się 18 czerwca 1815 roku — ostatnia bitwa Napoleona Bonaparte.',
    },
    {
      question: 'Kto dowodził siłami koalicji antynapoleońskiej pod Waterloo?',
      options: ['Wellington i Blücher', 'Wellington i Moore', 'York i Wellington', 'Castlereagh i Blücher'],
      correct: 0,
      explanation: 'Książę Wellington dowodził siłami brytyjsko-niderlandzkimi, a pruski marszałek Blücher przyprowadził na pole bitwy armię pruską.',
    },
    {
      question: 'W jakim kraju leży miejscowość Waterloo?',
      options: ['Francja', 'Holandia', 'Belgia', 'Niemcy'],
      correct: 2,
      explanation: 'Waterloo to miejscowość w dzisiejszej Belgii, ok. 15 km na południe od Brukseli.',
    },
    {
      question: 'Jaka jednostka napoleońska zasłynęła szarżą pod Waterloo?',
      options: ['Gwardia Cesarska', 'Huzarzy Śmierci', 'Lancierzy Wisły', 'Dragoneria Starszy'],
      correct: 0,
      explanation: 'Ostatnia szarża Starej Gwardii Cesarskiej zakończyła się klęską — to złamało ducha wojsk napoleońskich i przypieczętowało wynik bitwy.',
    },
    {
      question: 'Co stało się z Napoleonem po klęsce pod Waterloo?',
      options: [
        'Abdykował i trafił na Wyspę Świętej Heleny',
        'Uciekł do Ameryki Południowej',
        'Zawarł pokój i rządził Elba',
        'Został uwięziony w Paryżu',
      ],
      correct: 0,
      explanation: 'Napoleon abdykował po raz drugi i trafił na Wyspę Świętej Heleny na Atlantyku, gdzie spędził ostatnie lata życia i zmarł w 1821 r.',
    },
  ],

  // ══════════════════════════════════════════════════════════
  // TERMOPILE 480 p.n.e.
  // ══════════════════════════════════════════════════════════
  'thermopylae-480bc': [
    {
      question: 'Ilu spartańskich wojowników (według tradycji) broniło Wąwozu Termopilskiego?',
      options: ['100', '200', '300', '500'],
      correct: 2,
      explanation: '300 Spartan pod wodzą Leonidasa stawiło czoła potężnej armii perskiej. W rzeczywistości walczyło z nimi kilka tysięcy greckich sojuszników.',
    },
    {
      question: 'Kto dowodził Spartanami podczas obrony Termopil?',
      options: ['Temistokles', 'Leonidas I', 'Pauzaniasz', 'Epaminondas'],
      correct: 1,
      explanation: 'Leonidas I, król Sparty, dowodził obroną. Zginął na polu bitwy, stając się symbolem spartańskiej odwagi i poświęcenia.',
    },
    {
      question: 'Jak Persowie pokonali obronę Greków w Termopilach?',
      options: [
        'Przebili się siłą przez wąwóz po tygodniowym oblężeniu',
        'Zdrajca Efialtes wskazał im tajną ścieżkę górską',
        'Przekupili greckich dowódców',
        'Zaatakowali od strony morza',
      ],
      correct: 1,
      explanation: 'Grecki zdrajca Efialtes zdradził Persom ścieżkę przez góry (Anopaia), pozwalając okrążyć Greków. Leonidas odesłał większość sprzymierzeńców i z 300 Spartanami osłaniał odwrót.',
    },
    {
      question: 'Który król perski prowadził inwazję na Grecję w 480 r. p.n.e.?',
      options: ['Cyrus Wielki', 'Dariusz I', 'Kserkses I', 'Artakserkses II'],
      correct: 2,
      explanation: 'Kserkses I, syn Dariusza Wielkiego, dowodził ogromną armią perską szacowaną przez starożytne źródła na miliony, choć współczesne szacunki mówią o 100–300 tysiącach.',
    },
    {
      question: 'Jakie znaczenie miała obrona Termopil dla kampanii greckiej?',
      options: [
        'Grecy pokonali Persów i zakończyli wojnę',
        'Opóźniła Persów i podniosła morale Greków przed Salaminą',
        'Zmusiła Persów do wycofania się z Europy',
        'Pozwoliła Sparcie podbić Ateny',
      ],
      correct: 1,
      explanation: 'Choć Termopile były militarną klęską, bohaterska obrona opóźniła perskie natarcie i dała Grekom czas na przygotowanie zwycięskiej Bitwy pod Salaminą (480 p.n.e.).',
    },
  ],

  // ══════════════════════════════════════════════════════════
  // MARATON 490 p.n.e.
  // ══════════════════════════════════════════════════════════
  'marathon-490bc': [
    {
      question: 'W którym roku p.n.e. odbyła się Bitwa pod Maratonem?',
      options: ['510', '499', '490', '480'],
      correct: 2,
      explanation: 'Bitwa pod Maratonem odbyła się w 490 r. p.n.e. — pierwsze wielkie starcie Greków z armią perską Dariusza I.',
    },
    {
      question: 'Kto dowodził ateńskim wojskiem podczas Bitwy pod Maratonem?',
      options: ['Temistokles', 'Leonidas', 'Miltiadis', 'Perykles'],
      correct: 2,
      explanation: 'Miltiadis (Miltiades), doświadczony strateg ateński, zaproponował uderzenie na Persów bez czekania na Spartan i dowodził armią podczas bitwy.',
    },
    {
      question: 'Skąd pochodzi tradycja biegu maratońskiego?',
      options: [
        'Z perskiego systemu łączności',
        'Od gońca Feidippidesa, który pobiegł z Maratonu do Aten z wieścią o zwycięstwie',
        'Od spartańskich ćwiczeń wojskowych',
        'Z olimpijskich zawodów starożytnych Greków',
      ],
      correct: 1,
      explanation: 'Według legendy goniec Feidippides przebiegł ok. 40 km z Maratonu do Aten, ogłosił zwycięstwo słowem "Nike!" (Zwycięstwo!) i padł martwy. Stąd pochodzi bieg maratoński (42,195 km).',
    },
    {
      question: 'Jaka taktyczna innowacja Ateńczyków zaskoczyła Persów pod Maratonem?',
      options: [
        'Atak nocny z użyciem pochodni',
        'Szybki bieg hoplitów w kierunku wroga, by ominąć zasięg perskich łuków',
        'Ustawienie słoni bojowych na flankach',
        'Zastosowanie konnego oddziału kawalerii',
      ],
      correct: 1,
      explanation: 'Ateńscy hoplici przebiegli ok. 1,5 km w biegu (lub szybkim marszu), ograniczając czas narażenia na perskie strzały i uderzając z pełnym impetem. Taktyka zaskoczyła Persów.',
    },
    {
      question: 'Ile liczyła ateńska armia pod Maratonem w porównaniu z perską?',
      options: [
        'Ateńczycy mieli przewagę liczebną 2:1',
        'Obie armie były podobnej wielkości',
        'Persowie mieli ok. 2–3-krotną przewagę liczebną',
        'Persowie mieli 10-krotną przewagę',
      ],
      correct: 2,
      explanation: 'Ateńczyków było ok. 10 000 (plus 1 000 Platejczyków), Persów szacuje się na 20 000–25 000. Mimo to Ateńczycy wygrali dzięki taktyce, uzbrojeniu i determinacji.',
    },
  ],

  // ══════════════════════════════════════════════════════════
  // KANNY 216 p.n.e.
  // ══════════════════════════════════════════════════════════
  'cannae-216bc': [
    {
      question: 'Kto dowodził wojskami kartagińskimi podczas Bitwy pod Kannami?',
      options: ['Hamilkar Barkas', 'Azdrubal Barkas', 'Hannibal Barkas', 'Masynissa'],
      correct: 2,
      explanation: 'Hannibal Barkas — jeden z największych dowódców wojskowych w historii — dowodził Kartagińczykami. Wcześniej przeprowadził armię przez Alpy, by zaatakować Rzym od północy.',
    },
    {
      question: 'Jaką rewolucyjną taktykę zastosował Hannibal pod Kannami?',
      options: [
        'Głęboki szyk falangi greckiej',
        'Manewr okrążenia — zwabienie Rzymian w centrum i atak z flanek',
        'Nocny atak na obóz wroga',
        'Użycie słoni do przełamania linii',
      ],
      correct: 1,
      explanation: 'Hannibal zastosował genialne manewr okrążenia (envelopment): osłabione centrum powoli cofało się, wciągając Rzymian, podczas gdy silne flanki zamknęły ich w śmiertelnym uścisku.',
    },
    {
      question: 'Ile wojsk rzymskich zginęło podczas jednego dnia walki pod Kannami?',
      options: ['Ok. 10 000', 'Ok. 20 000', 'Ok. 50 000–70 000', 'Ok. 100 000'],
      correct: 2,
      explanation: 'Szacuje się, że 50 000–70 000 Rzymian zginęło w ciągu jednego dnia — jedna z największych jednorazowych klęsk w historii starożytnego Rzymu.',
    },
    {
      question: 'W jakim konflikcie toczyła się Bitwa pod Kannami?',
      options: [
        'Pierwsza Wojna Punicka',
        'Druga Wojna Punicka',
        'Trzecia Wojna Punicka',
        'Wojny Macedońskie',
      ],
      correct: 1,
      explanation: 'Kanny rozegrały się podczas Drugiej Wojny Punickiej (218–201 p.n.e.) — konfliktu między Kartaginą a Republiką Rzymską o dominację nad basenem Morza Śródziemnego.',
    },
    {
      question: 'Mimo druzgocącej klęski pod Kannami, Rzym nie poddał się. Co zadecydowało o jego przetrwaniu?',
      options: [
        'Hannibal zawarł pokój, otrzymując odszkodowanie',
        'Grecy przyszli Rzymowi z pomocą zbrojną',
        'Hannibal nie miał sprzętu oblężniczego, by zdobyć Rzym, a Kartagina odmawiała posiłków',
        'Klęska militarna była tak mała, że Rzym szybko się odrodził',
      ],
      correct: 2,
      explanation: 'Hannibal był mistrzem pola bitwy, lecz nie mógł zdobyć ufortyfikowanego Rzymu. Kartagina nie wysłała mu wystarczających posiłków, a Rzym zamiast atakować Hannibala, stopniowo odcinał Kartaginę w Afryce (strategia Scypiona).',
    },
  ],

  // ══════════════════════════════════════════════════════════
  // HASTINGS 1066
  // ══════════════════════════════════════════════════════════
  'hastings-1066': [
    {
      question: 'W którym roku odbyła się Bitwa pod Hastings?',
      options: ['1042', '1060', '1066', '1071'],
      correct: 2,
      explanation: 'Bitwa pod Hastings odbyła się 14 października 1066 roku — jeden z najbardziej przełomowych dni w historii Anglii.',
    },
    {
      question: 'Kto zwyciężył w Bitwie pod Hastings?',
      options: ['Harold II Godwinson', 'Wilhelm Zdobywca', 'Haralt III Sigurdsson', 'Edgar Eteling'],
      correct: 1,
      explanation: 'Wilhelm Zdobywca (Wilhelm I, książę Normandii) pokonał anglosakskiego króla Harolda II i podbił Anglię, stając się pierwszym normańskim królem Anglii.',
    },
    {
      question: 'Co — według legendy i Tkaniny z Bayeux — przydarzyło się Haroldowi II podczas bitwy?',
      options: [
        'Dostał się do niewoli i skapitulował',
        'Zginął od strzały w oko',
        'Uciekł z pola bitwy statkiem',
        'Poniósł śmierć w pojedynku z Wilhelmem',
      ],
      correct: 1,
      explanation: 'Tradycja, uwidoczniona na Tkaninie z Bayeux, głosi, że Harold II zginął od strzały w oko, choć historycy do dziś debatują nad dokładnymi okolicznościami jego śmierci.',
    },
    {
      question: 'Jaki był długofalowy skutek normańskiego podboju Anglii?',
      options: [
        'Anglia stała się częścią Imperium Romańskiego',
        'Język angielski wchłonął tysiące słów normańsko-francuskich, kształtując nowoczesną angielszczyzną',
        'Anglia i Francja zjednoczyły się w jedno królestwo',
        'Kościół anglikański powstał bezpośrednio po podboju',
      ],
      correct: 1,
      explanation: 'Podbój normański głęboko zmienił Anglię: normasko-francuski stał się językiem dworu i administracji, a do angielskiego weszło ok. 10 000 słów romańskich. Zmieniła się architektura, prawo i struktura feudalna.',
    },
    {
      question: 'Harald Sigurdsson (Hardrada) również walczył o tron Anglii w 1066 r. Gdzie Harold II pokonał go zaledwie kilka dni przed Hastings?',
      options: ['Stamford Bridge', 'York', 'Dover', 'Lincoln'],
      correct: 0,
      explanation: 'Zaledwie 19 dni przed Hastings, 25 września 1066, Harold II rozbił Haralda Hardradę w Bitwie pod Stamford Bridge. Następnie musiał natychmiast maszerować na południe, by stawić czoła Wilhelmowi — co osłabiło jego wojska.',
    },
  ],

  // ══════════════════════════════════════════════════════════
  // AZINCOURT 1415
  // ══════════════════════════════════════════════════════════
  'agincourt-1415': [
    {
      question: 'Który angielski król dowodził pod Azincourt?',
      options: ['Henryk IV', 'Henryk V', 'Ryszard III', 'Edward IV'],
      correct: 1,
      explanation: 'Henryk V poprowadził małą, wyczerpana armię angielską do zwycięstwa nad znacznie liczniejszymi Francuzami — bitwa ta stała się symbolem angielskiego bohaterstwa opiewanym przez Szekspira.',
    },
    {
      question: 'Jaka broń okazała się decydująca w Bitwie pod Azincourt?',
      options: ['Armaty', 'Długi łuk angielski (longbow)', 'Kuszniki genueńscy', 'Ciężka kawaleria'],
      correct: 1,
      explanation: 'Angielscy i walijscy łucznicy z długimi łukami (longbow) wystrzelili tysiące strzał na minutę, dziesiątkując ociężałą w pełnej zbroi francuską szlachtę brodzącą w błocie.',
    },
    {
      question: 'Dlaczego Francuzi byli uważani za bezapelacyjnych faworytów?',
      options: [
        'Mieli doskonałą artylerię',
        'Dysponowali przewagą ok. 3–6:1 w liczbie wojsk, głównie ciężką kawalerią',
        'Angielska armia była bez koni',
        'Walczyli na własnym dobrze poznanym terenie',
      ],
      correct: 1,
      explanation: 'Szacuje się, że Francuzi mieli 12 000–36 000 żołnierzy wobec ok. 6 000–9 000 Anglików, w tym 5 000–7 000 łuczników. Mimo to błoto, ciasne pole bitwy i łuki zadecydowały o losie starcia.',
    },
    {
      question: 'W jakim kontekście historycznym toczyła się Bitwa pod Azincourt?',
      options: [
        'Wojen Krzyżowych',
        'Stuletniej Wojny między Anglią a Francją',
        'Wojen Różanych',
        'Rekonkwisty iberyjskiej',
      ],
      correct: 1,
      explanation: 'Azincourt (1415) było kulminacyjnym momentem kolejnej angielskiej kampanii w czasie Stuletniej Wojny (1337–1453) — długiego konfliktu między Anglią a Francją o tron francuski.',
    },
    {
      question: 'Jakie były następstwa Bitwy pod Azincourt dla królestwa Francji?',
      options: [
        'Francja natychmiast poddała się Anglii',
        'Traktat w Troyes (1420) uznał Henryka V za dziedzica tronu Francji',
        'Francja utraciła Normandię na 200 lat',
        'Burgundia odłączyła się i przyłączyła do Anglii',
      ],
      correct: 1,
      explanation: 'Po Azincourt Henryk V kontynuował kampanię. Traktat w Troyes (1420) uczynił go regentem Francji i dziedzicem tronu — jednak jego syn Henryk VI ostatecznie przegrał Stuletnią Wojnę.',
    },
  ],

  // ══════════════════════════════════════════════════════════
  // LEPANTO 1571
  // ══════════════════════════════════════════════════════════
  'lepanto-1571': [
    {
      question: 'Kto walczył w Bitwie pod Lepanto w 1571 roku?',
      options: [
        'Hiszpania vs Francja',
        'Liga Święta (papież, Wenecja, Hiszpania) vs Imperium Osmańskie',
        'Wenecja vs Genua',
        'Anglia vs Imperium Osmańskie',
      ],
      correct: 1,
      explanation: 'Liga Święta, zmontowana przez papieża Piusa V, połączyła Wenecję, Hiszpanię, Genuę, Maltę i Państwo Kościelne przeciwko osmańskiej flecie Selima II.',
    },
    {
      question: 'Kto dowodził flotą Ligi Świętej pod Lepanto?',
      options: ['Karol V', 'Filip II', 'Jan Austriacki (don Juan de Austria)', 'Andrea Doria'],
      correct: 2,
      explanation: 'Jan Austriacki (don Juan de Austria), nieślubny syn Karola V, miał zaledwie 24 lata, gdy dowodził połączoną flotą chrześcijańską i odniósł wielkie zwycięstwo.',
    },
    {
      question: 'Który słynny pisarz brał udział w Bitwie pod Lepanto i odniósł tam poważne rany?',
      options: ['Francisco de Quevedo', 'Lope de Vega', 'Miguel de Cervantes', 'Tirso de Molina'],
      correct: 2,
      explanation: 'Miguel de Cervantes — autor "Don Kichota" — walczył pod Lepanto i stracił sprawność lewej ręki. Dumnie nazywał tę bitwę "najwspanialszą okazją, jaką widziały minione wieki".',
    },
    {
      question: 'Jakie strategiczne znaczenie miała Bitwa pod Lepanto?',
      options: [
        'Ottomanie podbili Włochy',
        'Zatrzymała osmańską ekspansję morską w zachodnim Morzu Śródziemnym',
        'Wenecja straciła Cypr',
        'Liga Święta odbiła Konstantynopol',
      ],
      correct: 1,
      explanation: 'Lepanto było pierwszą wielką porażką Imperium Osmańskiego od ponad wieku i zahamowało jego morską ekspansję na zachód. Jednak Ottomanie szybko odbudowali flotę.',
    },
    {
      question: 'Jaki rodzaj okrętów dominował w Bitwie pod Lepanto?',
      options: ['Żaglowce liniowe', 'Galery wioślarskie', 'Galeony', 'Drakkary'],
      correct: 1,
      explanation: 'Bitwa pod Lepanto była prawdopodobnie ostatnim wielkim starciem galery. Wiosłowe galery z setkami wioślarzy i żołnierzy abordażowych zdecydowały o jej wyniku, nim żaglowce wyparły ten typ jednostki.',
    },
  ],

  // ══════════════════════════════════════════════════════════
  // WIEDEŃ 1683
  // ══════════════════════════════════════════════════════════
  'vienna-1683': [
    {
      question: 'Który monarcha stał na czele odsieczy wiedeńskiej w 1683 roku?',
      options: ['Ludwik XIV', 'Jan III Sobieski', 'Leopold I Habsburg', 'Karol V Lotaryński'],
      correct: 1,
      explanation: 'Jan III Sobieski, król Polski, dowodził połączonymi siłami polsko-cesarskimi jako wódz naczelny. Pod jego komendą przeprowadzono największą szarżę kawaleryjską w historii.',
    },
    {
      question: 'Jaka formacja odegrała kluczową rolę w rozgromie armii osmańskiej pod Wiedniem?',
      options: ['Piechota szwajcarska', 'Husaria polska', 'Dragoni cesarscy', 'Janczarzy'],
      correct: 1,
      explanation: 'Husaria polska — ciężka kawaleria z charakterystycznymi skrzydłami — przeprowadziła 12 września 1683 roku jedną z największych szarż kawalerii w dziejach, rozbijając osmańskie linie i obóz.',
    },
    {
      question: 'Kto dowodził armią osmańską oblegającą Wiedeń?',
      options: ['Sulejman Wspaniały', 'Mustafa II', 'Kara Mustafa', 'Mehmed IV'],
      correct: 2,
      explanation: 'Wielki Wezyr Kara Mustafa Pasza dowodził armią szacowaną na 100 000–200 000 żołnierzy. Po klęsce pod Wiedniem został zaszlachtowany na rozkaz sułtana Mehmeda IV.',
    },
    {
      question: 'Jak długo trwało oblężenie Wiednia przez Osmanów w 1683 roku?',
      options: ['Kilka dni', 'Dwa tygodnie', 'Ok. dwa miesiące', 'Ponad pół roku'],
      correct: 2,
      explanation: 'Osmanie oblężyli Wiedeń od 14 lipca do 12 września 1683 roku — nieco ponad dwa miesiące. Miasto było bliskie kapitulacji z powodu braku żywności i strat, gdy przybyła odsiecz.',
    },
    {
      question: 'Jakie długofalowe znaczenie miała odsiecz wiedeńska dla Europy?',
      options: [
        'Imperium Osmańskie zostało natychmiast zniszczone',
        'Zapoczątkowała trwałe cofanie się Imperium Osmańskiego i wyzwolenie Węgier',
        'Polska stała się mocarstwem dominującym w Europie',
        'Austria podbiła Bałkany w ciągu roku',
      ],
      correct: 1,
      explanation: 'Odsiecz wiedeńska odwróciła losy osmańskiej ekspansji. Kolejne lata przyniosły wyzwolenie Węgier i Serbii. Traktat Karłowicki (1699) był pierwszą wielką cesją osmańską i początkiem długiego upadku imperium.',
    },
  ],

  // ══════════════════════════════════════════════════════════
  // ROCROI 1643
  // ══════════════════════════════════════════════════════════
  'rocroi-1643': [
    {
      question: 'W którym roku odbyła się Bitwa pod Rocroi?',
      options: ['1618', '1635', '1643', '1660'],
      correct: 2,
      explanation: 'Bitwa pod Rocroi rozegrała się 19 maja 1643 roku, kilka dni po śmierci Ludwika XIII — w momencie, gdy Francja była pod regencją Anny Austriaczki i kardynała Mazarina.',
    },
    {
      question: 'Ile lat miał książę Condé, gdy poprowadził Francuzów do zwycięstwa pod Rocroi?',
      options: ['19 lat', '22 lata', '30 lat', '38 lat'],
      correct: 1,
      explanation: 'Louis II de Bourbon, książę Condé (późniejszy Wielki Condé), miał zaledwie 22 lata. To jego pierwsze wielkie zwycięstwo, które przyniosło mu sławę największego francuskiego wodza.',
    },
    {
      question: 'Która formacja wojskowa poniosła decydującą klęskę pod Rocroi, kończąc epokę swej dominacji?',
      options: [
        'Gwardia Szwajcarska',
        'Tercjos (tercios) — hiszpańska piechota uważana za najlepszą w Europie',
        'Muszkieterowie Ludwika XIV',
        'Jazda turecka',
      ],
      correct: 1,
      explanation: 'Tercjos — głęboki, kwadratowy szyk piechoty i muszkieterów — przez ponad sto lat byli niezwyciężeni. Pod Rocroi po raz pierwszy ponieśli druzgocącą klęskę, co symbolicznie zakończyło epokę hiszpańskiej potęgi militarnej.',
    },
    {
      question: 'W jakim konflikcie toczyła się Bitwa pod Rocroi?',
      options: [
        'Wojnie Trzydziestoletniej',
        'Wojnie Sukcesyjnej Hiszpańskiej',
        'Wojnie Osiemdziesięcioletniej',
        'Wojnie o Sukcesję Polską',
      ],
      correct: 0,
      explanation: 'Rocroi było starciem w ramach Wojny Trzydziestoletniej (1618–1648) — ogólnoeuropejskiego konfliktu religijnego i politycznego. Francja walczyła po stronie antyhabsburskiej.',
    },
    {
      question: 'Co symbolizuje Rocroi w kontekście europejskiej historii wojskowości?',
      options: [
        'Koniec ery łucznictwa bojowego',
        'Przejście dominacji militarnej z Hiszpanii na Francję',
        'Triumf artylerii nad piechotą',
        'Początek ery napoleońskiej',
      ],
      correct: 1,
      explanation: 'Rocroi jest symbolem narodzin potęgi militarnej Francji i końca dominacji Habsburgów. Zwycięstwo otworzyło drogę do hegemonii Ludwika XIV w Europie.',
    },
  ],

  // ══════════════════════════════════════════════════════════
  // AUSTERLITZ 1805
  // ══════════════════════════════════════════════════════════
  'austerlitz-1805': [
    {
      question: 'Dlaczego Austerlitz jest nazywane "Bitwą Trzech Cesarzy"?',
      options: [
        'Brało w niej udział trzech marszałków Napoleona',
        'Walczyły armie trzech cesarskich potęg: Francji, Austrii i Rosji',
        'Bitwa podzielona była na trzy fazy',
        'Napoleon zdobył trzy trony po tej batalii',
      ],
      correct: 1,
      explanation: 'Pod Austerlitz stawał Napoleon I (Francja), Franciszek II (Austria) i car Aleksander I (Rosja). Była to jedyna bitwa, w której trzech cesarzy spotkało się na jednym polu walki.',
    },
    {
      question: 'Jaką genialna taktykę zastosował Napoleon, by wygrać pod Austerlitz?',
      options: [
        'Zaatakował z flanki nocą, zaskakując wroga',
        'Celowo osłabił prawe skrzydło, wabiąc wroga, by potem uderzyć na centrum (Pratzenplateau)',
        'Użył artylerii rakietowej jako pierwszej armii w historii',
        'Zawarł sojusz z lokalnymi chłopami jako partyzantami',
      ],
      correct: 1,
      explanation: 'Napoleon celowo odsłonił swoje prawe skrzydło, zachęcając Aleksandra do ataku. Gdy siły koalicji wciągnęły się w walkę, Napoleon uderzył na osłabione centrum — wzgórze Pratzen — rozrywając armię wroga na dwie części.',
    },
    {
      question: 'Który pokój zakończył wojnę po Austerlitz?',
      options: ['Pokój Paryski', 'Pokój Tylżycki', 'Pokój w Preszburgu', 'Pokój Wiedeński'],
      correct: 2,
      explanation: 'Pokój w Preszburgu (26 grudnia 1805) był dla Austrii niezwykle niekorzystny — utraciła Wenecję, Tyrol i inne terytoria. Jednocześnie Napoleon przekształcił liczne państwa niemieckie w Związek Reński.',
    },
    {
      question: 'Kiedy odbyła się Bitwa pod Austerlitz?',
      options: ['2 grudnia 1805', '14 czerwca 1800', '22 lipca 1812', '16 października 1813'],
      correct: 0,
      explanation: '2 grudnia 1805 roku — dokładnie rok po koronacji Napoleona na cesarza. Sam Napoleon uważał Austerlitz za swoje największe militarne osiągnięcie.',
    },
    {
      question: 'Jaki był długofalowy skutek zwycięstwa Napoleona pod Austerlitz?',
      options: [
        'Rozpad Świętego Cesarstwa Rzymskiego Narodu Niemieckiego',
        'Pokój w Europie na kolejne 20 lat',
        'Przyłączenie Austrii do Francji',
        'Przystąpienie Rosji do blokady kontynentalnej',
      ],
      correct: 0,
      explanation: 'Upokorzenie Franciszka II doprowadziło do rozwiązania Świętego Cesarstwa Rzymskiego (1806). Franciszek II zrzekł się tytułu cesarza i pozostał "jedynie" cesarzem Austrii.',
    },
  ],

  // ══════════════════════════════════════════════════════════
  // BORODINO 1812
  // ══════════════════════════════════════════════════════════
  'borodino-1812': [
    {
      question: 'Kto dowodził armią rosyjską podczas Bitwy pod Borodino?',
      options: ['Aleksander Suworow', 'Piotr Bagration', 'Michaił Kutuzow', 'Michaił Barclay de Tolly'],
      correct: 2,
      explanation: 'Michaił Kutuzow przejął dowództwo nad armią rosyjską niedługo przed Borodino, zastępując niepopularnego Barclaya de Tolly. Jego strategia — oddanie Moskwy, by wykończyć Napoleona zimą — okazała się genialna.',
    },
    {
      question: 'Jaki był wynik Bitwy pod Borodino?',
      options: [
        'Rosyjskie zwycięstwo i odrzucenie Napoleona',
        'Nierozstrzygnięte starcie — obie strony poniosły ogromne straty',
        'Druzgocące zwycięstwo Napoleona',
        'Rosja skapitulowała i zawarła pokój',
      ],
      correct: 1,
      explanation: 'Bitwa nie przyniosła rozstrzygnięcia. Kutuzow wycofał armię w porządku, Napoleon nie zdołał jej zniszczyć. Obie strony straciły ok. 70 000–80 000 ludzi — był to jeden z najkrwawszych dni wojennych w historii.',
    },
    {
      question: 'Co Napoleon zdobył po Borodino, ale czego to nie przyniosło?',
      options: [
        'Zdobył Kijów, ale Ukraina nadal walczyła',
        'Zdobył Petersburg, ale car nie uciekł',
        'Zdobył Moskwę, ale car Aleksander nie zawarł pokoju',
        'Zdobył Warszawę, ale Polska nie wsparła go militarnie',
      ],
      correct: 2,
      explanation: 'Napoleon zajął Moskwę 14 września 1812 r., ale car Aleksander odmówił negocjacji. Moskalwę podpalono; Napoleon czekał próżno na pokój. Po 35 dniach musiał rozpocząć katastrofalny odwrót w zimie.',
    },
    {
      question: 'W którym roku odbyła się Bitwa pod Borodino?',
      options: ['1805', '1808', '1812', '1815'],
      correct: 2,
      explanation: 'Bitwa pod Borodino rozegrała się 7 września 1812 roku podczas Kampanii Rosyjskiej Napoleona — wyprawy, która zakończyła się katastrofą i początkiem jego upadku.',
    },
    {
      question: 'Który rosyjski generał zginął w Bitwie pod Borodino?',
      options: ['Kutuzow', 'Piotr Bagration', 'Barclay de Tolly', 'Aleksander Tormassow'],
      correct: 1,
      explanation: 'Generał Piotr Bagration, jeden z najwybitniejszych rosyjskich dowódców, śmiertelnie raniony podczas obrony lewego skrzydła (bateria Bagrationa). Jego śmierć była wielką stratą dla Rosji.',
    },
  ],

  // ══════════════════════════════════════════════════════════
  // VERDUN 1916
  // ══════════════════════════════════════════════════════════
  'verdun-1916': [
    {
      question: 'Jak długo trwała Bitwa pod Verdun?',
      options: ['Tydzień', 'Miesiąc', 'Ok. 10 miesięcy (luty–grudzień 1916)', 'Dwa lata'],
      correct: 2,
      explanation: 'Bitwa pod Verdun trwała od 21 lutego do 18 grudnia 1916 roku — dziesięć miesięcy. To jedna z najdłuższych i najkrwawszych bitew I Wojny Światowej.',
    },
    {
      question: 'Jaki był oficjalny cel niemieckiej ofensywy pod Verdun według gen. Falkenhayna?',
      options: [
        'Zdobycie Paryża okrężną drogą',
        '"Wykrwawienie" Francji — zadanie jej strat nie do zniesienia',
        'Odcięcie brytyjskich linii zaopatrzeniowych',
        'Zdobycie kluczowych złóż rudy żelaza w Lotaryngii',
      ],
      correct: 1,
      explanation: 'Erich von Falkenhayn zakładał, że Verdun jako symbol narodowy zmusi Francję do obrony za wszelką cenę. Niemcy chcieli wykrwawić armię francuską, nie koniecznie zdobyć miasto. Plan obrócił się jednak i przeciwko samym Niemcom.',
    },
    {
      question: 'Który fort pod Verdun symbolizuje upór obrony francuskiej?',
      options: ['Fort Douaumont', 'Fort Vaux', 'Fort Souville', 'Fort Moulainville'],
      correct: 0,
      explanation: 'Fort Douaumont — największy i najsilniejszy fort systemu Verdun — zdobyty przez Niemców w lutym 1916 r. i odzyskany przez Francję w październiku tegoż roku. Jego losy symbolizują całą bitwę.',
    },
    {
      question: 'Jakim symbolem stało się Verdun dla Francji?',
      options: [
        'Symbolem porażki i traumy narodowej',
        'Symbolem niezniszczalności i bohaterskiej obrony ojczyzny',
        'Symbolem nieudolności dowódców',
        'Symbolem sojuszu z Wielką Brytanią',
      ],
      correct: 1,
      explanation: 'Zawołanie "On ne passe pas!" ("Nie przejdą!") stało się symbolem francuskiej determinacji. Verdun jest miejscem pamięci narodowej, symbolem ofiary i nieustępliwości Francji.',
    },
    {
      question: 'Ile ofiar po obu stronach pochłonęła Bitwa pod Verdun?',
      options: ['Ok. 100 000', 'Ok. 300 000', 'Ok. 700 000–800 000', 'Ok. 2 miliony'],
      correct: 2,
      explanation: 'Szacuje się, że w Bitwie pod Verdun zginęło lub zostało rannych ok. 700 000–800 000 żołnierzy po obu stronach — ok. 400 000 Francuzów i 340 000 Niemców. Rozległe pola bitwy są do dziś skażone i wyludnione.',
    },
  ],

  // ══════════════════════════════════════════════════════════
  // SOMMA 1916
  // ══════════════════════════════════════════════════════════
  'somme-1916': [
    {
      question: 'Ile ofiar (zabitych i rannych) Wielka Brytania poniosła w pierwszym dniu Bitwy nad Sommą (1 lipca 1916)?',
      options: ['Ok. 5 000', 'Ok. 19 000 zabitych + ok. 38 000 rannych = ~57 000', 'Ok. 100 000', 'Ok. 200 000'],
      correct: 1,
      explanation: 'Pierwszy dzień Bitwy nad Sommą — 1 lipca 1916 r. — był najkrwawszym dniem w historii Armii Brytyjskiej: ok. 19 240 zabitych i ok. 38 230 rannych w ciągu jednego dnia.',
    },
    {
      question: 'Jaka nowa broń pojawiła się po raz pierwszy na polu bitwy w trakcie Bitwy nad Sommą?',
      options: ['Gaz bojowy', 'Czołg (tank)', 'Samolot bojowy', 'Granat ręczny'],
      correct: 1,
      explanation: 'Czołgi (tanks) zadebiutowały bojowo 15 września 1916 roku podczas Bitwy nad Sommą. Choć ich pierwsza kampania miała ograniczony sukces, zapoczątkowała erę opancerzonej walki.',
    },
    {
      question: 'Kto dowodził Brytyjczykami w Bitwie nad Sommą?',
      options: ['Lord Kitchener', 'Douglas Haig', 'John French', 'Edmund Allenby'],
      correct: 1,
      explanation: 'Feldmarszałek Douglas Haig dowodził Brytyjskim Korpusem Ekspedycyjnym. Jego decyzja o kontynuowaniu ofensywy mimo ogromnych strat jest do dziś dyskutowana przez historyków.',
    },
    {
      question: 'Jaki był strategiczny cel Bitwy nad Sommą z perspektywy Aliantów?',
      options: [
        'Zdobycie Berlina do końca roku',
        'Odciążenie obrońców Verdun i przebicie frontu',
        'Zajęcie portów La Manche',
        'Wsparcie rosyjskiej ofensywy na wschodzie',
      ],
      correct: 1,
      explanation: 'Bitwa nad Sommą miała dwie role: odciążyć wykrwawioną Francję w Verdun i przebić front zachodni. Żaden z celów nie został w pełni osiągnięty.',
    },
    {
      question: 'Ile terenu zdobyły siły alianckie podczas całej Bitwy nad Sommą (lipiec–listopad 1916)?',
      options: ['Ok. 3 km', 'Ok. 10–12 km', 'Ok. 50 km', 'Ok. 100 km'],
      correct: 1,
      explanation: 'Po czterech miesiącach walk, milionowych stratach po obu stronach i 600 km kwadratowych pola bitwy, Alianci zdobyli zaledwie ok. 10–12 km terenu — przy stratach ok. 1,2 miliona ludzi łącznie.',
    },
  ],

  // ══════════════════════════════════════════════════════════
  // MARNA 1914
  // ══════════════════════════════════════════════════════════
  'marne-1914': [
    {
      question: 'Jaki był główny skutek strategiczny Pierwszej Bitwy nad Marną (wrzesień 1914)?',
      options: [
        'Niemcy zdobyli Paryż',
        'Zatrzymanie niemieckiego natarcia i udaremnienie Planu Schlieffena',
        'Rosja zaatakowała Niemcy od wschodu i wymusiła odwrót',
        'Francja wycofała się za Loarę',
      ],
      correct: 1,
      explanation: 'Bitwa nad Marną (5–12 września 1914) zatrzymała błyskawiczne natarcie Niemiec, ratując Paryż i France. Plan Schlieffena — zakładający szybkie pokonanie Francji — definitywnie zawiódł, co skazało Niemcy na wojnę na dwa fronty.',
    },
    {
      question: 'Który francuski generał dowodził podczas Pierwszej Bitwy nad Marną?',
      options: ['Ferdinand Foch', 'Joseph Joffre', 'Philippe Pétain', 'Maxime Weygand'],
      correct: 1,
      explanation: 'Generał Joseph Joffre, naczelny dowódca armii francuskiej, zorganizował kontruderzenie nad Marną. Wykazał się żelazną wolą, kontynuując ofensywę mimo krytycznych strat w sierpniu 1914.',
    },
    {
      question: 'Jak taksówki paryskie wpisały się w historię Bitwy nad Marną?',
      options: [
        'Przewoziły cywilów uciekających z Paryża',
        'Dostarczyły ok. 6 000 żołnierzy na front, stając się symbolem obrony',
        'Służyły jako ambulanse dla rannych',
        'Przewoziły amunicję na pierwszą linię',
      ],
      correct: 1,
      explanation: 'Ok. 600 paryskich taksówek przewiozło nocą 6–7 września 1914 ok. 6 000 żołnierzy rezerwy na front. Choć militarnie miało to ograniczone znaczenie, "Taksówki Marny" stały się symbolem bohaterskiej obrony Paryża.',
    },
    {
      question: 'Który błąd po stronie niemieckiej przyczynił się do klęski nad Marną?',
      options: [
        'Brak łączności między armiami spowodował lukę w linii, którą Alianci wykorzystali',
        'Niemcy wyczerpali zapasy amunicji',
        'Cesarz Wilhelm II odwołał atak wbrew woli dowódców',
        'Francja użyła gazów bojowych',
      ],
      correct: 0,
      explanation: 'Między 1. a 2. Armią Niemiecką powstała luka. Gdy brytyjski wywiad ją wykrył, siły alianckie weszły w tę przerwę. Niemcy musieli się wycofać, by uniknąć okrążenia — koniec wojny ruchowej i początek okopów.',
    },
    {
      question: 'Co nastąpiło po Pierwszej Bitwie nad Marną?',
      options: [
        'Niemcy wycofały się do Berlina i zawarły pokój',
        'Obie strony zaczęły budować sieć okopów — "Wyścig do Morza"',
        'Rosja wycofała się z wojny wschodniej',
        'USA przystąpiły do konfliktu',
      ],
      correct: 1,
      explanation: 'Po Marnie Niemcy wycofali się nad Aisne. Obie strony próbowały okrążyć skrzydło wroga — "Wyścig do Morza" zakończył się, gdy front okopów ciągnął się od Belgii do Szwajcarii. Zaczęła się cztery lata statyczna wojna pozycyjna.',
    },
  ],

  // ══════════════════════════════════════════════════════════
  // BITWA O ANGLIĘ 1940
  // ══════════════════════════════════════════════════════════
  'britain-1940': [
    {
      question: 'W którym roku toczyła się Bitwa o Anglię?',
      options: ['1939', '1940', '1941', '1942'],
      correct: 1,
      explanation: 'Bitwa o Anglię rozegrała się od lipca do października 1940 roku — była to pierwsza wielka bitwa powietrzna w historii i pierwsze zwycięstwo Aliantów w II Wojnie Światowej.',
    },
    {
      question: 'Jakie dwa typy samolotów myśliwskich były podstawą obrony RAF?',
      options: [
        'Lancaster i Halifax',
        'Spitfire i Hurricane',
        'Mosquito i Typhoon',
        'Wellington i Stirling',
      ],
      correct: 1,
      explanation: 'Supermarine Spitfire i Hawker Hurricane — dwa ikony RAF Fighter Command. Hurricane, choć starszy, stanowił ok. 55% floty myśliwskiej RAF i zestrzelił więcej samolotów Luftwaffe niż Spitfire.',
    },
    {
      question: 'Kto był Naczelnym Dowódcą RAF Fighter Command podczas Bitwy o Anglię?',
      options: ['Arthur "Bomber" Harris', 'Hugh Dowding', 'Keith Park', 'Sholto Douglas'],
      correct: 1,
      explanation: 'Air Chief Marshal Hugh Dowding ("Stuffy") zorganizował obronę Anglii, wdrożył system wczesnego ostrzegania radarowego i rezerwował siły. Winston Churchill powiedział o pilotach RAF: "Nigdy w historii ludzkich konfliktów tylu nie zawdzięczało tak wiele tak nielicznym."',
    },
    {
      question: 'Jaka decyzja Luftwaffe zmieniła bieg Bitwy o Anglię na korzyść RAF?',
      options: [
        'Porzucenie bombardowania lotnisk na rzecz bombardowania Londynu (Blitz)',
        'Skierowanie ataków na fabryki silników lotniczych',
        'Ograniczenie ataków do godzin nocnych',
        'Odstąpienie od bombardowań radarów',
      ],
      correct: 0,
      explanation: 'Gdy Niemcy przerzucili się z bombardowania lotnisk RAF na ataki na Londyn i miasta (Blitz), lotniska RAF miały czas na naprawę. To był strategiczny błąd — RAF zdążył odbudować siły i wygrać.',
    },
    {
      question: 'Jaki był skutek zwycięstwa RAF w Bitwie o Anglię?',
      options: [
        'Niemcy natychmiast zaatakowały ZSRR',
        'Hitler zaniechał Operacji Lew Morski — planu inwazji lądowej na Anglię',
        'Anglia przystąpiła do ataku na Francję',
        'USA przystąpiły do II WŚ',
      ],
      correct: 1,
      explanation: 'Niezdolność Luftwaffe do uzyskania przewagi powietrznej zmusiła Hitlera do bezterminowego odroczenia Operacji Lew Morski (Seelöwe) — planowanego desantu na Anglię. Wielka Brytania pozostała bastionem oporu.',
    },
  ],

  // ══════════════════════════════════════════════════════════
  // STALINGRAD 1942–1943
  // ══════════════════════════════════════════════════════════
  'stalingrad-1942': [
    {
      question: 'Kto dowodził 6. Armią Niemiecką oblężoną pod Stalingradem?',
      options: ['Erwin Rommel', 'Erich von Manstein', 'Friedrich Paulus', 'Walter Model'],
      correct: 2,
      explanation: 'Generał Friedrich Paulus dowodził 6. Armią. 31 stycznia 1943 roku, w dniu kapitulacji, Hitler awansował go na feldmarszałka — żaden feldmarszałek nigdy wcześniej nie oddał się do niewoli.',
    },
    {
      question: 'Jak nazywała się radziecka operacja okrążenia wojsk niemieckich pod Stalingradem?',
      options: ['Operacja Bagration', 'Operacja Uran', 'Operacja Saturn', 'Operacja Iskra'],
      correct: 1,
      explanation: 'Operacja Uran (19–23 listopada 1942) — radzieckie natarcie na słabiej obsadzone flanki niemieckie (bronione przez Rumunów, Węgrów i Włochów), które zamknęło ok. 300 000 żołnierzy Osi w kotle stalingradzkim.',
    },
    {
      question: 'Jaki był przebieg bitwy ulicznej w Stalingradzie dla żołnierzy?',
      options: [
        'Walki były głównie na otwartym polu',
        'Niemcy szybko zdobyli miasto bez poważnych walk',
        'Walki dom po domu, piętro po piętrze — "Rattenkrieg" (Szczurza Wojna)',
        'Radzieccy obrońcy walczyli wyłącznie z umocnień podziemnych',
      ],
      correct: 2,
      explanation: 'Niemcy nazwali walki w mieście "Rattenkrieg" (Szczurza Wojna). Żołnierze walczyli o każdy budynek, każde piętro, każdy pokój. Słynna hala fabryczna "Krasny Oktiabr" zmieniała ręce wielokrotnie.',
    },
    {
      question: 'Kiedy skapitulowały ostatnie siły niemieckie pod Stalingradem?',
      options: ['Grudzień 1942', '2 lutego 1943', '1 maja 1943', 'Styczeń 1944'],
      correct: 1,
      explanation: '2 lutego 1943 roku feldmarszałek Paulus skapitulował z resztą wojsk. Z ok. 300 000 otoczonych żołnierzy do końca przeżyło ok. 91 000 (wielu zdążyło ewakuować się lub poległo). Do Niemiec po wojnie wróciło jedynie ok. 6 000.',
    },
    {
      question: 'Dlaczego Stalingrad był tak ważny dla obu stron?',
      options: [
        'Miasto było centrum produkcji ropy naftowej',
        'Kontrolowało przeprawy przez Wołgę i nosiło imię Stalina — miało wartość symboliczną i strategiczną',
        'Było siedzibą radzieckiego rządu w czasie wojny',
        'Sowieci ukryli tam główne rezerwy złota',
      ],
      correct: 1,
      explanation: 'Stalingrad leżał na Wołdze — głównej arterii komunikacyjnej Rosji. Jego zdobycie przecięłoby dostawy ropy z Kaukazu. Ponadto miasto nosiło imię Stalina, co nadawało walce wymiar symboliczny dla obu dyktatorów.',
    },
  ],

  // ══════════════════════════════════════════════════════════
  // KURSK 1943
  // ══════════════════════════════════════════════════════════
  'kursk-1943': [
    {
      question: 'Czym zasłynęła Bitwa pod Kurskiem w historii wojskowości?',
      options: [
        'Pierwszym użyciem bomb atomowych',
        'Największą bitwą pancerną w historii',
        'Pierwszym desantem powietrznym na wielką skalę',
        'Największym bombardowaniem dywanowym w historii',
      ],
      correct: 1,
      explanation: 'Bitwa pod Kurskiem (lipiec–sierpień 1943) była największą bitwą pancerną w historii — wzięły w niej udział tysiące czołgów po obu stronach. Decydujące starcie pancerne pod Prochorowką (12 lipca 1943) skupiło na jednym polu ok. 1 200 czołgów.',
    },
    {
      question: 'Jak nazywał się plan Niemców ataku na "łuk kurski"?',
      options: [
        'Operacja Barbarossa',
        'Operacja Cytadela (Zitadelle)',
        'Operacja Fall Blau',
        'Operacja Nordwind',
      ],
      correct: 1,
      explanation: 'Operacja Cytadela (Unternehmen Zitadelle) zakładała atak z dwóch stron na wystający front radziecki (łuk kurski) i okrążenie setek tysięcy żołnierzy. Sowieci odgadli plan dzięki wywiadowi (sieć "Lucy") i zbudowali głęboki system obrony.',
    },
    {
      question: 'Dlaczego Hitler kilkakrotnie odkładał termin Operacji Cytadela?',
      options: [
        'Czekał na posiłki z Afryki Północnej',
        'Chciał poczekać na dostawy nowych czołgów Tygrys i Pantera',
        'Sowieci mieli przewagę liczebną 10:1',
        'Zła pogoda uniemożliwiała atak przez miesiące',
      ],
      correct: 1,
      explanation: 'Hitler chciał mieć jak najwięcej nowych Tygrysów (Tiger I) i Panter (Panther) oraz niszczycieli czołgów Ferdinand. Opóźnienia pozwoliły Sowietom dokładnie przygotować głęboką obronę i rozbudować siły pancerne.',
    },
    {
      question: 'Jaki był wynik Bitwy pod Kurskiem?',
      options: [
        'Niemcy przebili front i okrążyli Sowietów',
        'Sowieci odepchnęli Niemców i przeszli do strategicznej ofensywy',
        'Bitwa zakończyła się remisem i stabilizacją frontu',
        'Niemcy zdobyli Kursk i Charków',
      ],
      correct: 1,
      explanation: 'Niemcy nie osiągnęli celów Cytadeli i ponieśli ciężkie straty w sprzęcie pancernym. Sowieci przeszli do kontrofensywy i od tej pory inicjatywa strategiczna na froncie wschodnim przeszła w ich ręce definitywnie.',
    },
    {
      question: 'Co spowodowało wstrzymanie Operacji Cytadela po zaledwie kilku dniach walk?',
      options: [
        'Desant aliantów na Sycylię wymusił przerzut sił na zachód',
        'Utrata większości czołgów w pierwszym dniu',
        'Bunt generałów przeciw Hitlerowi',
        'Rozkaz Stalina o kontrataku atomowym',
      ],
      correct: 0,
      explanation: '10 lipca 1943 r. alianci wylądowali na Sycylii. Hitler, obawiając się o front włoski, nakazał zatrzymać Cytadelę i przerzucił siły na zachód. Kursk stał się ostatnią wielką inicjatywą strategiczną Niemiec na wschodzie.',
    },
  ],

  // ══════════════════════════════════════════════════════════
  // NORMANDIA 1944 (D-Day)
  // ══════════════════════════════════════════════════════════
  'normandy-1944': [
    {
      question: 'Jak nazywała się operacja lądowania w Normandii 6 czerwca 1944?',
      options: ['Operacja Market Garden', 'Operacja Overlord', 'Operacja Torch', 'Operacja Dragoon'],
      correct: 1,
      explanation: 'Operacja Overlord — największa morska operacja desantowa w historii. Zaangażowała ponad 156 000 żołnierzy, 7 000 okrętów i 11 000 samolotów. Lądowanie na plażach Normandii 6 czerwca 1944 (D-Day) otworzyło drugi front zachodni.',
    },
    {
      question: 'Ile plaż desantowych wyznaczono w Normandii i jak je nazwano?',
      options: [
        '3 plaże: Gold, Omaha, Utah',
        '5 plaż: Utah, Omaha, Gold, Juno, Sword',
        '6 plaż: Alpha, Beta, Gold, Omaha, Utah, Sword',
        '4 plaże: Utah, Omaha, Juno, Sword',
      ],
      correct: 1,
      explanation: 'Pięć plaż: Utah i Omaha (Amerykanie), Gold i Sword (Brytyjczycy), Juno (Kanadyjczycy). Najcięższe walki toczyły się na Omaha Beach, gdzie 1. i 29. Dywizja US Army straciła ponad 2 000 zabitych w samym D-Day.',
    },
    {
      question: 'Kto dowodził wszystkimi siłami alianckimi (SHAEF) podczas inwazji w Normandii?',
      options: ['Bernard Montgomery', 'George Patton', 'Dwight D. Eisenhower', 'Omar Bradley'],
      correct: 2,
      explanation: 'Generał Dwight D. "Ike" Eisenhower był Naczelnym Dowódcą Sił Ekspedycyjnych (SHAEF). To on podjął decyzję o terminie lądowania — 6 czerwca 1944 — korzystając z krótkiego okna pogodowego.',
    },
    {
      question: 'Na jakie rozmieszczenie wojsk liczył Hitler, że uniemożliwi aliantom desant?',
      options: [
        'Sądził, że desant nastąpi w Bretanii',
        'Oczekiwał głównego uderzenia w Pas-de-Calais — i dał się zmylić operacją dezinformacyjną FORTITUDE',
        'Uważał, że atak przyjdzie z południa Francji',
        'Nie wierzył w możliwość desantu morskiego',
      ],
      correct: 1,
      explanation: 'Operacja FORTITUDE skutecznie przekonała Niemców, że główny desant nastąpi w Pas-de-Calais. Hitler trzymał dwie dywizje pancerne z dala od Normandii, czekając na "prawdziwy" atak — co umożliwiło aliantom ugruntowanie się na plaży.',
    },
    {
      question: 'Jakie oddziały walczyły w składzie sił alianckich podczas lądowania w Normandii?',
      options: [
        'Tylko Stany Zjednoczone i Wielka Brytania',
        'USA, Wielka Brytania, Kanada, Free France, Polska, Australia i inne 7 narodów',
        'USA, Wielka Brytania i ZSRR',
        'Wyłącznie wojska NATO',
      ],
      correct: 1,
      explanation: 'W operacji uczestniczyły wojska z ponad 12 krajów: USA, UK, Kanada, Wolna Francja, Polska (1. Dywizja Pancerna gen. Maczka odegrała kluczową rolę w późniejszym zamknięciu kotła Falaise), Australia, Nowa Zelandia i inne.',
    },
  ],

  // ══════════════════════════════════════════════════════════
  // BERLIN 1945
  // ══════════════════════════════════════════════════════════
  'berlin-1945': [
    {
      question: 'Kiedy skapitulował Berlin i zakończyły się walki w Europie?',
      options: ['30 kwietnia 1945', '2 maja 1945', '8 maja 1945', '15 maja 1945'],
      correct: 1,
      explanation: 'Berlin skapitulował 2 maja 1945 roku. Całkowita kapitulacja Niemiec nastąpiła 8 maja 1945 (Dzień Zwycięstwa w Europie — VE Day), po podpisaniu aktu bezwarunkowej kapitulacji.',
    },
    {
      question: 'Który radziecki marszałek dowodził 1. Frontem Białoruskim szturmującym Berlin od wschodu?',
      options: ['Iwan Koniew', 'Konstantin Rokossowski', 'Aleksander Wasilewski', 'Gieorgij Żukow'],
      correct: 3,
      explanation: 'Marszałek Gieorgij Żukow dowodził 1. Frontem Białoruskim, który zaatakował centralnie przez Wzgórza Seelow. 1. Front Ukraiński Koniewa uderzył od południa — rywalizacja obu marszałków przyspieszyła zdobycie Berlina.',
    },
    {
      question: 'Co stało się z Hitlerem podczas Bitwy o Berlin?',
      options: [
        'Uciekł do Argentyny',
        'Poddał się aliantom zachodnim',
        'Popełnił samobójstwo 30 kwietnia 1945 r. w bunkrze w Berlinie',
        'Zginął podczas bombardowania',
      ],
      correct: 2,
      explanation: '30 kwietnia 1945 roku, gdy radzieckie wojska zbliżały się do Reichskancelarii, Hitler i Eva Braun popełnili samobójstwo w Führerbunkrze. Ich ciała zostały spalone zgodnie z jego poleceniem.',
    },
    {
      question: 'Jak wielkie straty poniósł Berlin i jego cywilna ludność podczas szturmu?',
      options: [
        'Miał ok. 100 000 mieszkańców i nie ucierpiał znacznie',
        'Miasto zostało niemal całkowicie ewakuowane przed walkami',
        'Śmierć poniosło ok. 22 000–125 000 cywilów, miasto leżało w gruzach',
        'Alianci zbombardowali Berlin bez strat wśród ludności cywilnej',
      ],
      correct: 2,
      explanation: 'Szacunki mówią o 22 000–125 000 zabitych cywilach. Berlin w 70% leżał w gruzach. Bitwa trwała od 16 kwietnia do 2 maja 1945, uczestniczyło w niej ok. 2,5 miliona żołnierzy radzieckich.',
    },
    {
      question: 'Jaki symboliczny akt dokonali radzieccy żołnierze na szczycie Reichstagu?',
      options: [
        'Zawiesili portret Stalina',
        'Zatknęli Flagę Zwycięstwa (czerwona flaga z sierpem i młotem)',
        'Zapalili znicz upamiętniający ofiary',
        'Wystrzelili salwę honorową',
      ],
      correct: 1,
      explanation: 'Zdjęcie Jewgienija Chałdieja przedstawiające dwóch radzieckich żołnierzy zatykających czerwoną flagę na dachu Reichstagu 2 maja 1945 r. stało się jedną z ikonicznych fotografii II Wojny Światowej.',
    },
  ],

  // ══════════════════════════════════════════════════════════
  // GETTYSBURG 1863
  // ══════════════════════════════════════════════════════════
  'gettysburg-1863': [
    {
      question: 'W jakim konflikcie toczyła się Bitwa pod Gettysburgiem?',
      options: [
        'Wojnie o Niepodległość USA (1775–1783)',
        'Wojnie Secesyjnej (1861–1865)',
        'Wojnie Meksykańsko-Amerykańskiej (1846–1848)',
        'Wojnie Hiszpańsko-Amerykańskiej (1898)',
      ],
      correct: 1,
      explanation: 'Gettysburg (1–3 lipca 1863) była jedną z decydujących bitew Wojny Secesyjnej — konfliktu między Unią (Północ) a Konfederacją (Południe) toczącego się od 1861 do 1865 roku.',
    },
    {
      question: 'Kto dowodził Armią Wirginii Północnej (Konfederacja) pod Gettysburgiem?',
      options: ['Ulysses S. Grant', 'Thomas "Stonewall" Jackson', 'Robert E. Lee', 'James Longstreet'],
      correct: 2,
      explanation: 'Generał Robert E. Lee poprowadził drugą inwazję na Północ. Po klęsce pod Gettysburgiem już nigdy nie był w stanie przeprowadzić ofensywy na dużą skalę.',
    },
    {
      question: 'Co to był "Pickett\'s Charge" (Szarża Picketta) i dlaczego jest sławna?',
      options: [
        'Nocny atak Unii na pozycje Konfederacji na Cemetery Ridge',
        'Desperackie czołowe natarcie 12 500 konfederatów na pozycje Unii — zakończone katastrofą',
        'Szarża kawalerii Janowskiego na lewe skrzydło Konfederacji',
        'Artyleryski przełom Unii na Culps Hill',
      ],
      correct: 1,
      explanation: 'Szarża Picketta (3 lipca 1863) — 12 500 żołnierzy Konfederacji szturmowało otwarte pole ognia piechoty i artylerii Unii na Cemetery Ridge. Ponad połowa nigdy nie wróciła. Lee później mówił: "To wszystko moja wina."',
    },
    {
      question: 'Jakie słynne przemówienie wygłosił Abraham Lincoln po Bitwie pod Gettysburgiem?',
      options: [
        'Orędzie o stanie państwa (State of the Union)',
        'Przemówienie Gettysburskie (Gettysburg Address)',
        'Proklamacja Emancypacji',
        'Mowa inauguracyjna',
      ],
      correct: 1,
      explanation: 'Przemówienie Gettysburskie (Gettysburg Address) z 19 listopada 1863 r. Lincoln wygłosił podczas poświęcenia cmentarza wojskowego. Słynne zdanie: "rząd ludu, przez lud i dla ludu" — 272 słowa — uważane jest za jedno z najwybitniejszych przemówień w historii.',
    },
    {
      question: 'Jaki był skutek Bitwy pod Gettysburgiem dla przebiegu Wojny Secesyjnej?',
      options: [
        'Konfederacja podbita w ciągu miesiąca',
        'Punkt zwrotny — Robert E. Lee nigdy więcej nie zaatakował Północy',
        'Natychmiastowe zakończenie niewolnictwa na Południu',
        'Przystąpienie Wielkiej Brytanii do Unii jako sojusznika',
      ],
      correct: 1,
      explanation: 'Gettysburg był punktem zwrotnym. Połączony z upadkiem Vicksburga (4 lipca 1863) — strategicznego fortu na Missisipi — dał Unii inicjatywę na obu teatrach. Lee przeszedł do defensywy i już nigdy nie atakował terytorium Północy.',
    },
  ],

  // ══════════════════════════════════════════════════════════
  // BITWY DODATKOWE — fallback pytania (3)
  // ══════════════════════════════════════════════════════════
  '__default__': [
    {
      question: 'Która epoka historyczna obejmuje lata 476–1500 n.e.?',
      options: ['Starożytność', 'Średniowiecze', 'Nowożytność', 'Era Napoleońska'],
      correct: 1,
      explanation: 'Średniowiecze trwało od upadku Rzymu Zachodniego (476 n.e.) do odkrycia Ameryki (1492) lub upadku Konstantynopola (1453).',
    },
    {
      question: 'Jak nazywa się broń palna, która zrewolucjonizowała pola bitew w XV–XVI w.?',
      options: ['Arbalet', 'Lonbow', 'Muszkiet', 'Katapulta'],
      correct: 2,
      explanation: 'Muszkiet — proch strzelniczy i broń palna zmieniły taktykę wojenną, stopniowo zastępując rycerzy i łuczników.',
    },
    {
      question: 'Która organizacja wydała kod "Geneva Convention" regulujący prawa wojenne?',
      options: ['Liga Narodów', 'ONZ', 'Czerwony Krzyż / Komitet Genewski', 'NATO'],
      correct: 2,
      explanation: 'Konwencja Genewska powstała z inicjatywy Henriego Dunanta i Komitetu Genewskiego, poprzednika Czerwonego Krzyża.',
    },
  ],
};

/** Zwraca pytania dla podanej bitwy lub fallback */
export function getQuizForBattle(battleId: string): QuizQuestion[] {
  return QUIZ_DATA[battleId] ?? QUIZ_DATA['__default__'];
}

/** Oblicza XP za quiz: 20 XP za każdą poprawną, +50 bonus za 100% */
export function calcQuizXP(correct: number, total: number): number {
  const base  = correct * 20;
  const bonus = correct === total ? 50 : 0;
  return base + bonus;
}
