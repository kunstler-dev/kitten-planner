// Legal launch roadmap for a bookbinding workshop + souvenir shop in Coburg (Bavaria, Germany).
// Content is general guidance, not legal advice — every step links to the official source.

export const LEGAL_PHASES = [
  { id: 'prep', title: { uk: 'Підготовка', de: 'Vorbereitung' } },
  { id: 'register', title: { uk: 'Реєстрація бізнесу', de: 'Anmeldung des Gewerbes' } },
  { id: 'shop', title: { uk: 'Приміщення і договори', de: 'Ladenlokal & Verträge' } },
  { id: 'compliance', title: { uk: 'Каса, продаж і правила', de: 'Kasse, Verkauf & Pflichten' } },
  { id: 'ongoing', title: { uk: 'Регулярні обовʼязки', de: 'Laufende Pflichten' } },
];

export const LEGAL_STEPS = [
  {
    id: 'l-residence',
    phase: 'prep',
    title: { uk: 'Перевірити дозвіл на самозайнятість', de: 'Erlaubnis zur Selbstständigkeit prüfen' },
    desc: {
      uk: 'Якщо у тебе Aufenthaltstitel (наприклад, §24 AufenthG для громадян України), переконайся, що в ньому дозволена самостійна діяльність («Erwerbstätigkeit erlaubt» / «selbständige Tätigkeit gestattet»).',
      de: 'Mit einem Aufenthaltstitel (z. B. § 24 AufenthG) prüfen, ob eine selbstständige Tätigkeit erlaubt ist („Erwerbstätigkeit erlaubt“ / „selbständige Tätigkeit gestattet“).',
    },
    todo: {
      uk: [
        'Подивитися запис у документі на перебування',
        'Якщо незрозуміло — запитати Ausländerbehörde Coburg',
        'Якщо отримуєш Bürgergeld — повідомити Jobcenter про плани',
      ],
      de: [
        'Eintrag im Aufenthaltsdokument prüfen',
        'Bei Unklarheit die Ausländerbehörde Coburg fragen',
        'Bei Bürgergeld-Bezug das Jobcenter informieren',
      ],
    },
    links: [{ label: 'Stadt Coburg', url: 'https://www.coburg.de' }],
    time: { uk: '1 день', de: '1 Tag' },
  },
  {
    id: 'l-advice',
    phase: 'prep',
    title: { uk: 'Безкоштовна консультація для засновників', de: 'Kostenlose Gründungsberatung' },
    desc: {
      uk: 'IHK zu Coburg (торгівля) і Handwerkskammer für Oberfranken (ремесло) безкоштовно консультують засновників: форма бізнесу, дозволи, субсидії. Для палітурної справи + сувенірів актуальні обидві палати.',
      de: 'IHK zu Coburg (Handel) und Handwerkskammer für Oberfranken (Handwerk) beraten Gründerinnen kostenlos zu Rechtsform, Genehmigungen und Förderung. Für Buchbinderei + Souvenirs sind beide Kammern relevant.',
    },
    todo: {
      uk: [
        'Записатися на консультацію в IHK або HWK',
        'Підготувати коротке описання ідеї (1 сторінка)',
        'Записати питання: оподаткування, Kleinunternehmer, субсидії',
      ],
      de: [
        'Beratungstermin bei IHK oder HWK vereinbaren',
        'Kurzbeschreibung der Idee (1 Seite) vorbereiten',
        'Fragen notieren: Steuern, Kleinunternehmer, Förderung',
      ],
    },
    links: [
      { label: 'IHK zu Coburg', url: 'https://www.ihk.de/coburg' },
      { label: 'HWK Oberfranken', url: 'https://www.hwk-oberfranken.de' },
    ],
    time: { uk: '1–2 тижні', de: '1–2 Wochen' },
  },
  {
    id: 'l-legalform',
    phase: 'prep',
    title: { uk: 'Обрати правову форму', de: 'Rechtsform wählen' },
    desc: {
      uk: 'Для старту найпростіше — Einzelunternehmen (аналог ФОП): без статутного капіталу, реєстрація в Gewerbeamt. Відповідальність — усім майном. Альтернатива — UG/GmbH (дорожче, нотаріус). У діловій документації вказують імʼя та прізвище власниці; назву магазину можна використовувати як вивіску.',
      de: 'Für den Start am einfachsten: Einzelunternehmen — kein Mindestkapital, Anmeldung beim Gewerbeamt, Haftung mit dem Privatvermögen. Alternative: UG/GmbH (teurer, Notar). Im Geschäftsverkehr Vor- und Nachname angeben; der Ladenname darf als Geschäftsbezeichnung genutzt werden.',
    },
    todo: {
      uk: [
        'Вирішити: Einzelunternehmen чи UG',
        'Придумати назву магазину і перевірити, що вона вільна (пошук + DPMA)',
        'Перевірити вільний домен для сайту',
      ],
      de: [
        'Entscheiden: Einzelunternehmen oder UG',
        'Ladennamen finden und prüfen (Recherche + DPMA)',
        'Freie Domain für die Website prüfen',
      ],
    },
    links: [
      { label: 'Existenzgründungsportal BMWK', url: 'https://www.existenzgruendungsportal.de' },
      { label: 'DPMA Markenrecherche', url: 'https://register.dpma.de' },
    ],
  },
  {
    id: 'l-businessplan',
    phase: 'prep',
    title: { uk: 'Бізнес-план і фінансовий план', de: 'Businessplan & Finanzplan' },
    desc: {
      uk: 'Потрібен для банку, субсидій і Gründungszuschuss. Опиши концепцію (палітурна майстерня + сувеніри в центрі Кобурга), клієнтів, конкурентів, ціни, витрати на старт і план продажів на 3 роки.',
      de: 'Nötig für Bank, Förderung und Gründungszuschuss. Konzept (Buchbinderei + Souvenirs in der Coburger Innenstadt), Zielgruppen, Wettbewerb, Preise, Startkosten und Umsatzplanung für 3 Jahre.',
    },
    todo: {
      uk: [
        'Описати концепцію та асортимент',
        'Порахувати стартові витрати (оренда, інструменти, матеріали, ремонт)',
        'Порахувати ціни у вкладці «Майстерня»',
        'План доходів/витрат на 36 місяців',
      ],
      de: [
        'Konzept und Sortiment beschreiben',
        'Startkosten berechnen (Miete, Werkzeug, Material, Umbau)',
        'Preise im Tab „Werkstatt“ kalkulieren',
        'Umsatz-/Kostenplan für 36 Monate',
      ],
    },
    links: [{ label: 'Businessplan-Hilfe (BMWK)', url: 'https://www.existenzgruendungsportal.de' }],
    time: { uk: '2–4 тижні', de: '2–4 Wochen' },
  },
  {
    id: 'l-funding',
    phase: 'prep',
    title: { uk: 'Перевірити субсидії та кредити', de: 'Förderung & Finanzierung prüfen' },
    desc: {
      uk: 'Gründungszuschuss від Agentur für Arbeit (якщо отримуєш ALG I — подавати ДО старту), Einstiegsgeld від Jobcenter (при Bürgergeld), кредити KfW (ERP-Gründerkredit StartGeld) і LfA Förderbank Bayern.',
      de: 'Gründungszuschuss der Agentur für Arbeit (bei ALG I — VOR dem Start beantragen), Einstiegsgeld vom Jobcenter (bei Bürgergeld), KfW ERP-Gründerkredit StartGeld und LfA Förderbank Bayern.',
    },
    todo: {
      uk: [
        'Зʼясувати, на яку підтримку маєш право',
        'Отримати оцінку бізнес-плану (fachkundige Stelle, напр. IHK)',
        'Подати заявку до дати реєстрації бізнесу',
      ],
      de: [
        'Klären, welche Förderung infrage kommt',
        'Tragfähigkeitsbescheinigung einholen (z. B. IHK)',
        'Antrag vor der Gewerbeanmeldung stellen',
      ],
    },
    links: [
      { label: 'Agentur für Arbeit', url: 'https://www.arbeitsagentur.de/arbeitslos-arbeit-finden/gruendungszuschuss' },
      { label: 'KfW', url: 'https://www.kfw.de' },
      { label: 'LfA Förderbank Bayern', url: 'https://lfa.de' },
    ],
  },
  {
    id: 'l-gewerbe',
    phase: 'register',
    title: { uk: 'Зареєструвати Gewerbe (Gewerbeanmeldung)', de: 'Gewerbeanmeldung' },
    desc: {
      uk: 'Реєстрація бізнесу в Gewerbeamt міста Кобург або онлайн через BayernPortal (потрібен BayernID). Після цього Gewerbeamt сам повідомляє Finanzamt, IHK/HWK та Berufsgenossenschaft.',
      de: 'Anmeldung beim Gewerbeamt der Stadt Coburg oder online über das BayernPortal (BayernID nötig). Das Gewerbeamt informiert danach Finanzamt, IHK/HWK und Berufsgenossenschaft.',
    },
    todo: {
      uk: [
        'Підготувати паспорт / Aufenthaltstitel',
        'Опис діяльності: «Buchbinderei (Herstellung von Notizbüchern, Büchern, Alben), Einzelhandel mit Geschenkartikeln, Souvenirs und Schreibwaren, Online-Handel»',
        'Подати заявку і сплатити збір (зазвичай кілька десятків євро)',
        'Зберегти Gewerbeschein у вкладці «Документи»',
      ],
      de: [
        'Ausweis / Aufenthaltstitel bereitlegen',
        'Tätigkeit: „Buchbinderei (Herstellung von Notizbüchern, Büchern, Alben), Einzelhandel mit Geschenkartikeln, Souvenirs und Schreibwaren, Online-Handel“',
        'Anmeldung einreichen und Gebühr zahlen (meist einige Dutzend Euro)',
        'Gewerbeschein im Tab „Dokumente“ ablegen',
      ],
    },
    links: [
      { label: 'BayernPortal', url: 'https://www.bayernportal.de' },
      {
        label: 'IHK Coburg: Gewerbeanmeldung',
        url: 'https://www.ihk.de/coburg/beratung-und-service/gruendung-nachfolge/gewerbeanmeldung-6578548',
      },
    ],
    time: { uk: '1 день', de: '1 Tag' },
  },
  {
    id: 'l-hwk',
    phase: 'register',
    title: { uk: 'Handwerkskammer: внесення до реєстру', de: 'Handwerkskammer: Eintragung' },
    desc: {
      uk: 'Палітурник (Buchbinder) — ремесло без обовʼязкового майстерського диплому (HwO, Anlage B1). Але діяльність треба зареєструвати в Handwerkskammer für Oberfranken (Verzeichnis zulassungsfreier Handwerke). Членство обовʼязкове, внески на старті знижені.',
      de: 'Buchbinder ist ein zulassungsfreies Handwerk (HwO, Anlage B1) — keine Meisterpflicht. Die Tätigkeit muss aber bei der Handwerkskammer für Oberfranken ins Verzeichnis zulassungsfreier Handwerke eingetragen werden. Pflichtmitgliedschaft, Beiträge in den ersten Jahren ermäßigt.',
    },
    todo: {
      uk: [
        'Подати заявку на внесення до реєстру',
        'Додати документи про освіту/досвід, якщо є',
        'Отримати Eintragungsbestätigung',
      ],
      de: ['Eintragung beantragen', 'Vorhandene Qualifikationsnachweise beilegen', 'Eintragungsbestätigung erhalten'],
    },
    links: [{ label: 'HWK Oberfranken', url: 'https://www.hwk-oberfranken.de' }],
  },
  {
    id: 'l-ihk',
    phase: 'register',
    title: { uk: 'IHK zu Coburg (торгівля сувенірами)', de: 'IHK zu Coburg (Souvenirhandel)' },
    desc: {
      uk: 'Через роздрібну торгівлю сувенірами ти, ймовірно, станеш також членом IHK (змішане підприємство). Членство автоматичне; малі засновники часто звільнені від внесків перші роки. Уточни, яка палата основна.',
      de: 'Durch den Einzelhandel mit Souvenirs wirst du voraussichtlich auch IHK-Mitglied (Mischbetrieb). Die Mitgliedschaft entsteht automatisch; kleine Gründungen sind oft einige Jahre beitragsfrei. Klären, welche Kammer federführend ist.',
    },
    todo: {
      uk: ['Дочекатися листа від IHK', 'Уточнити розподіл між IHK і HWK'],
      de: ['Schreiben der IHK abwarten', 'Zuständigkeit IHK/HWK klären'],
    },
    links: [{ label: 'IHK zu Coburg', url: 'https://www.ihk.de/coburg' }],
  },
  {
    id: 'l-finanzamt',
    phase: 'register',
    title: { uk: 'Finanzamt: анкета і Steuernummer', de: 'Finanzamt: Fragebogen & Steuernummer' },
    desc: {
      uk: 'Протягом місяця після старту заповнити «Fragebogen zur steuerlichen Erfassung» в ELSTER. Тут ти обираєш Kleinunternehmerregelung (§19 UStG): без ПДВ у рахунках, якщо оборот минулого року ≤ 25 000 € і поточного ≤ 100 000 €. Отримаєш Steuernummer, за потреби — USt-IdNr для закупівель в ЄС.',
      de: 'Innerhalb eines Monats nach Start den „Fragebogen zur steuerlichen Erfassung“ in ELSTER ausfüllen. Hier wird über die Kleinunternehmerregelung (§ 19 UStG) entschieden: keine Umsatzsteuer, wenn Vorjahresumsatz ≤ 25.000 € und laufendes Jahr ≤ 100.000 €. Ergebnis: Steuernummer, ggf. USt-IdNr für EU-Einkäufe.',
    },
    todo: {
      uk: [
        'Зареєструватися в ELSTER (активація поштою ~2 тижні)',
        'Заповнити Fragebogen',
        'Вирішити: Kleinunternehmer чи з ПДВ',
        'Вписати Steuernummer у налаштування (для рахунків)',
      ],
      de: [
        'ELSTER-Konto anlegen (Aktivierung per Post ~2 Wochen)',
        'Fragebogen ausfüllen',
        'Entscheiden: Kleinunternehmer oder Regelbesteuerung',
        'Steuernummer in den Einstellungen eintragen (für Rechnungen)',
      ],
    },
    links: [{ label: 'ELSTER', url: 'https://www.elster.de' }],
    time: { uk: '2–4 тижні', de: '2–4 Wochen' },
  },
  {
    id: 'l-bg',
    phase: 'register',
    title: { uk: 'Berufsgenossenschaft (страхування від нещасних випадків)', de: 'Berufsgenossenschaft anmelden' },
    desc: {
      uk: 'Протягом тижня після старту зареєструватися у профільній Berufsgenossenschaft. Для палітурної справи це зазвичай BG ETEM (друк і обробка паперу), для торгівлі — BGHW; яка саме — підкаже BG. Для власниці страхування часто добровільне, для працівників — обовʼязкове.',
      de: 'Innerhalb einer Woche nach Start bei der zuständigen Berufsgenossenschaft anmelden. Für Buchbinderei meist BG ETEM (Druck und Papierverarbeitung), für Handel die BGHW — die Zuständigkeit klärt die BG. Für die Inhaberin oft freiwillig, für Beschäftigte Pflicht.',
    },
    todo: {
      uk: ['Подати повідомлення в BG', 'Вирішити щодо добровільного страхування себе'],
      de: ['Anmeldung bei der BG', 'Über freiwillige Unternehmerversicherung entscheiden'],
    },
    links: [
      { label: 'BG ETEM', url: 'https://www.bgetem.de' },
      { label: 'BGHW', url: 'https://www.bghw.de' },
    ],
  },
  {
    id: 'l-insurance-health',
    phase: 'register',
    title: { uk: 'Медичне страхування і пенсія', de: 'Kranken- & Altersvorsorge' },
    desc: {
      uk: 'Самозайняті самі відповідають за медичне страхування: повідом свою Krankenkasse про старт бізнесу (внесок залежить від доходу). Подумай про пенсійні накопичення.',
      de: 'Selbstständige kümmern sich selbst um die Krankenversicherung: Krankenkasse über die Gründung informieren (Beitrag einkommensabhängig). Altersvorsorge einplanen.',
    },
    todo: {
      uk: ['Повідомити Krankenkasse', 'Дізнатися розмір внеску', 'Запланувати пенсійні накопичення'],
      de: ['Krankenkasse informieren', 'Beitragshöhe klären', 'Altersvorsorge planen'],
    },
    links: [],
  },
  {
    id: 'l-lease',
    phase: 'shop',
    title: { uk: 'Перевірити договір оренди (Gewerbemietvertrag)', de: 'Gewerbemietvertrag prüfen' },
    desc: {
      uk: 'Комерційна оренда майже не захищена законом, як житлова. Перевір: мета використання (роздрібна торгівля + майстерня), строк і опції продовження, індексація, застава, комунальні платежі, ремонт, вивіска, захист від конкуренції.',
      de: 'Gewerbemiete ist kaum gesetzlich geschützt. Prüfen: Nutzungszweck (Einzelhandel + Werkstatt), Laufzeit und Verlängerungsoption, Indexmiete, Kaution, Nebenkosten, Renovierung, Werbeschild, Konkurrenzschutz.',
    },
    todo: {
      uk: [
        'Попросити IHK/юриста переглянути договір',
        'Домовитися про безкоштовні місяці на ремонт',
        'Зберегти договір у «Документах»',
      ],
      de: [
        'Vertrag von IHK/Anwalt prüfen lassen',
        'Mietfreie Zeit für den Umbau verhandeln',
        'Vertrag unter „Dokumente“ ablegen',
      ],
    },
    links: [],
  },
  {
    id: 'l-building',
    phase: 'shop',
    title: { uk: 'Зміна використання приміщення і памʼятки', de: 'Nutzungsänderung & Denkmalschutz' },
    desc: {
      uk: 'Якщо приміщення раніше не було магазином (напр., офіс), може знадобитися Nutzungsänderung (Bauamt). Старе місто Кобурга має багато памʼяток архітектури — зміни фасаду, вітрини та вивіски погоджуються з містом.',
      de: 'War das Lokal vorher kein Laden (z. B. Büro), kann eine Nutzungsänderung beim Bauamt nötig sein. In der Coburger Altstadt stehen viele Gebäude unter Denkmalschutz — Änderungen an Fassade, Schaufenster und Schildern mit der Stadt abstimmen.',
    },
    todo: {
      uk: [
        'Запитати орендодавця про попереднє використання',
        'Уточнити в Bauamt міста Кобург',
        'Не починати ремонт фасаду без погодження',
      ],
      de: [
        'Vermieter nach bisheriger Nutzung fragen',
        'Beim Bauamt der Stadt Coburg nachfragen',
        'Fassadenarbeiten erst nach Freigabe',
      ],
    },
    links: [{ label: 'Stadt Coburg', url: 'https://www.coburg.de' }],
  },
  {
    id: 'l-signs',
    phase: 'shop',
    title: { uk: 'Вивіска, штендер і вітрина на тротуарі', de: 'Werbeschild, Kundenstopper, Warenauslage' },
    desc: {
      uk: 'Для вивіски потрібен дозвіл (Werbeanlage), для штендера чи столика з товаром на тротуарі — Sondernutzungserlaubnis від міста. У Кобурзі за це стягується плата.',
      de: 'Für das Ladenschild ist eine Genehmigung (Werbeanlage) nötig, für Kundenstopper oder Warenauslage auf dem Gehweg eine Sondernutzungserlaubnis der Stadt. In Coburg fallen dafür Gebühren an.',
    },
    todo: {
      uk: ['Підготувати ескіз вивіски', 'Подати заявки в місто', 'Закласти витрати в бюджет'],
      de: ['Entwurf des Schildes erstellen', 'Anträge bei der Stadt stellen', 'Gebühren im Budget einplanen'],
    },
    links: [{ label: 'Stadt Coburg', url: 'https://www.coburg.de' }],
  },
  {
    id: 'l-insurance',
    phase: 'shop',
    title: { uk: 'Страхування бізнесу', de: 'Betriebliche Versicherungen' },
    desc: {
      uk: 'Мінімум: Betriebshaftpflicht (відповідальність перед клієнтами). Рекомендовано: страхування майна і товару (Inhaltsversicherung — пожежа, вода, крадіжка), скла вітрини.',
      de: 'Mindestens: Betriebshaftpflicht. Empfohlen: Inhaltsversicherung (Feuer, Wasser, Einbruch) für Werkzeug und Ware, Glasversicherung fürs Schaufenster.',
    },
    todo: {
      uk: ['Порівняти 2–3 пропозиції', 'Оформити Betriebshaftpflicht до відкриття'],
      de: ['2–3 Angebote vergleichen', 'Betriebshaftpflicht vor Eröffnung abschließen'],
    },
    links: [],
  },
  {
    id: 'l-bank',
    phase: 'shop',
    title: { uk: 'Окремий бізнес-рахунок', de: 'Geschäftskonto eröffnen' },
    desc: {
      uk: 'Для Einzelunternehmen не обовʼязковий, але дуже бажаний: легше вести облік і готувати податкові декларації.',
      de: 'Für Einzelunternehmen nicht Pflicht, aber dringend empfohlen: saubere Buchhaltung und einfachere Steuererklärung.',
    },
    todo: {
      uk: ['Відкрити рахунок', 'Вписати IBAN у налаштування (для рахунків-фактур)'],
      de: ['Konto eröffnen', 'IBAN in den Einstellungen eintragen (für Rechnungen)'],
    },
    links: [],
  },
  {
    id: 'l-register-pos',
    phase: 'compliance',
    title: { uk: 'Касовий апарат з TSE і чеки', de: 'Kasse mit TSE & Belegpflicht' },
    desc: {
      uk: 'Електронна каса має бути з сертифікованим захисним модулем (TSE, KassenSichV). Кожному покупцеві видається чек (паперовий або електронний). Касу треба зареєструвати у Finanzamt через ELSTER протягом місяця після покупки. Альтернатива — «відкрита каса» з касовою книгою.',
      de: 'Elektronische Kassen brauchen eine zertifizierte TSE (KassenSichV). Belegausgabepflicht (Papier oder digital). Die Kasse muss innerhalb eines Monats nach Anschaffung über ELSTER gemeldet werden. Alternative: offene Ladenkasse mit Kassenbuch.',
    },
    todo: {
      uk: ['Обрати касу з TSE (або відкриту касу)', 'Зареєструвати касу в ELSTER', 'Налаштувати картковий термінал'],
      de: ['Kasse mit TSE wählen (oder offene Ladenkasse)', 'Kasse in ELSTER melden', 'Kartenterminal einrichten'],
    },
    links: [{ label: 'ELSTER', url: 'https://www.elster.de' }],
  },
  {
    id: 'l-prices',
    phase: 'compliance',
    title: { uk: 'Ціни і маркування товарів', de: 'Preisangaben & Produktkennzeichnung' },
    desc: {
      uk: 'Ціни вказуються кінцеві, з ПДВ (PAngV). Для власних виробів за GPSR (Регламент ЄС про безпеку продукції) на товарі або упаковці — твоє імʼя, адреса й ідентифікатор товару (номер артикулу/партії).',
      de: 'Endpreise inkl. MwSt. angeben (PAngV). Für eigene Produkte nach GPSR (EU-Produktsicherheitsverordnung): Name, Anschrift und Produktkennung (Artikel-/Chargennummer) auf Produkt oder Verpackung.',
    },
    todo: {
      uk: ['Зробити етикетки з адресою та номером артикулу', 'Цінники на всі товари'],
      de: ['Etiketten mit Adresse und Artikelnummer gestalten', 'Alle Waren auspreisen'],
    },
    links: [],
  },
  {
    id: 'l-online',
    phase: 'compliance',
    title: { uk: 'Правила для сайту та онлайн-продажу', de: 'Pflichten für Website & Online-Shop' },
    desc: {
      uk: 'Impressum, Datenschutzerklärung (GDPR), умови продажу (AGB), інформація про право на повернення 14 днів (Widerrufsbelehrung), кнопка «zahlungspflichtig bestellen», банер cookies. Перед першою посилкою — реєстрація в LUCID (Verpackungsregister) і договір із системою переробки упаковки. В оголошеннях — дані виробника за GPSR.',
      de: 'Impressum, Datenschutzerklärung (DSGVO), AGB, Widerrufsbelehrung, Button „zahlungspflichtig bestellen“, Cookie-Banner. Vor dem ersten Versand: Registrierung im Verpackungsregister LUCID und Beteiligung an einem dualen System. GPSR-Herstellerangaben in jedem Angebot.',
    },
    todo: {
      uk: [
        'Згенерувати юридичні тексти (напр., через IHK або юридичний сервіс)',
        'Зареєструватися в LUCID',
        'Підписати договір із системою (duales System)',
      ],
      de: [
        'Rechtstexte erstellen (z. B. über einen Rechtstexte-Dienst)',
        'LUCID-Registrierung',
        'Vertrag mit dualem System abschließen',
      ],
    },
    links: [{ label: 'LUCID Verpackungsregister', url: 'https://lucid.verpackungsregister.org' }],
  },
  {
    id: 'l-fees',
    phase: 'compliance',
    title: { uk: 'Rundfunkbeitrag і GEMA', de: 'Rundfunkbeitrag & GEMA' },
    desc: {
      uk: 'Магазин (Betriebsstätte) треба зареєструвати для Rundfunkbeitrag. Якщо в магазині грає музика — потрібна ліцензія GEMA (або музика без роялті).',
      de: 'Die Betriebsstätte beim Rundfunkbeitrag anmelden. Läuft im Laden Musik, ist eine GEMA-Lizenz nötig (oder GEMA-freie Musik).',
    },
    todo: {
      uk: ['Зареєструвати магазин на rundfunkbeitrag.de', 'Вирішити щодо музики в магазині'],
      de: ['Betriebsstätte auf rundfunkbeitrag.de anmelden', 'Musik im Laden klären'],
    },
    links: [
      { label: 'Rundfunkbeitrag', url: 'https://www.rundfunkbeitrag.de' },
      { label: 'GEMA', url: 'https://www.gema.de' },
    ],
  },
  {
    id: 'l-staff',
    phase: 'compliance',
    title: { uk: 'Якщо наймаєш працівника (Minijob)', de: 'Falls du Personal einstellst (Minijob)' },
    desc: {
      uk: 'Потрібні Betriebsnummer від Bundesagentur für Arbeit, реєстрація в Minijob-Zentrale та в BG. Не обовʼязково на старті.',
      de: 'Nötig: Betriebsnummer der Bundesagentur für Arbeit, Anmeldung bei der Minijob-Zentrale und der BG. Für den Start optional.',
    },
    todo: {
      uk: ['Отримати Betriebsnummer', 'Зареєструвати працівника в Minijob-Zentrale'],
      de: ['Betriebsnummer beantragen', 'Minijobber bei der Minijob-Zentrale anmelden'],
    },
    links: [{ label: 'Minijob-Zentrale', url: 'https://www.minijob-zentrale.de' }],
    optional: true,
  },
  {
    id: 'l-bookkeeping',
    phase: 'ongoing',
    title: { uk: 'Облік доходів і витрат (EÜR)', de: 'Buchhaltung & EÜR' },
    desc: {
      uk: 'Записувати всі доходи й витрати, зберігати чеки і рахунки (8–10 років). Щороку — Einnahmen-Überschuss-Rechnung (EÜR). Вкладка «Фінанси» допоможе вести записи; податкового консультанта (Steuerberater) варто мати хоча б для першої декларації.',
      de: 'Alle Einnahmen und Ausgaben erfassen, Belege 8–10 Jahre aufbewahren. Jährlich Einnahmen-Überschuss-Rechnung (EÜR). Der Tab „Finanzen“ hilft beim Erfassen; ein Steuerberater lohnt sich mindestens für die erste Erklärung.',
    },
    todo: {
      uk: ['Щотижня вносити витрати й доходи', 'Сканувати чеки у «Документи»', 'Знайти Steuerberater'],
      de: ['Wöchentlich Einnahmen/Ausgaben erfassen', 'Belege unter „Dokumente“ ablegen', 'Steuerberater suchen'],
    },
    links: [],
  },
  {
    id: 'l-taxes',
    phase: 'ongoing',
    title: { uk: 'Податкові терміни', de: 'Steuertermine' },
    desc: {
      uk: 'Без Kleinunternehmer: Umsatzsteuer-Voranmeldung (щомісяця або щокварталу — визначає Finanzamt). Щорічно: Einkommensteuer-, Umsatzsteuer- та Gewerbesteuererklärung. Gewerbesteuer для Einzelunternehmen — лише з прибутку понад 24 500 €. Finanzamt може призначити авансові платежі.',
      de: 'Ohne Kleinunternehmerregelung: Umsatzsteuer-Voranmeldung (monatlich oder vierteljährlich — legt das Finanzamt fest). Jährlich: Einkommen-, Umsatz- und Gewerbesteuererklärung. Gewerbesteuer erst ab Gewinn über 24.500 € (Freibetrag). Das Finanzamt kann Vorauszahlungen festsetzen.',
    },
    todo: {
      uk: ['Внести податкові дати в календар', 'Відкладати 25–30 % прибутку на податки'],
      de: ['Steuertermine in den Kalender eintragen', '25–30 % des Gewinns für Steuern zurücklegen'],
    },
    links: [{ label: 'ELSTER', url: 'https://www.elster.de' }],
  },
];
