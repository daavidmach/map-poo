import { useState, useEffect, useRef, useMemo } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import './App.css'

// ── 5 pilierov POO SR ─────────────────────────────────────────────────────────
const PILLAR = {
  zelena:      { l:'Zelená ekonomika',              c:'#4CAF50', icon:'🌿' },
  vzdelavanie: { l:'Kvalitné vzdelávanie',           c:'#9C27B0', icon:'🎓' },
  veda:        { l:'Veda, výskum, inovácie',         c:'#2196F3', icon:'🔬' },
  zdravie:     { l:'Zdravý život',                   c:'#ef5350', icon:'❤️' },
  sprava:      { l:'Efektívna verejná správa',       c:'#FF9800', icon:'🏛️' },
}

// ── POO Komponenty SR — kódy K01–K18 podľa oficiálneho RRP ───────────────────
// Zdroj: planobnovy.sk / MF SR — 5 pilierov, 18 komponentov
const KN_MAP = [
  null,
  { l:'Obnoviteľné zdroje energie',   icon:'☀️', c:'#66BB6A', p:'zelena'      }, // K01
  { l:'Obnova budov',                 icon:'🏠', c:'#4CAF50', p:'zelena'      }, // K02
  { l:'Udržateľná doprava',           icon:'🚌', c:'#26C6DA', p:'zelena'      }, // K03
  { l:'Dekarbonizácia priemyslu',     icon:'🏭', c:'#78909C', p:'zelena'      }, // K04
  { l:'Adaptácia na zmenu klímy',     icon:'🌍', c:'#1B8C3A', p:'zelena'      }, // K05
  { l:'Inkluzívne vzdelávanie',       icon:'📚', c:'#CE93D8', p:'vzdelavanie' }, // K06
  { l:'Vzdelávanie pre 21. storočie', icon:'🎓', c:'#9C27B0', p:'vzdelavanie' }, // K07
  { l:'Výkonnosť vysokých škôl',      icon:'🏫', c:'#7B1FA2', p:'vzdelavanie' }, // K08
  { l:'Veda, výskum a inovácie',      icon:'🔬', c:'#42A5F5', p:'veda'        }, // K09
  { l:'Lákanie a udržanie talentov',  icon:'💡', c:'#1E88E5', p:'veda'        }, // K10
  { l:'Zdravotná starostlivosť',      icon:'🏥', c:'#ef5350', p:'zdravie'     }, // K11
  { l:'Duševné zdravie',              icon:'🧠', c:'#E91E63', p:'zdravie'     }, // K12
  { l:'Dlhodobá starostlivosť',       icon:'👴', c:'#e57373', p:'zdravie'     }, // K13
  { l:'Podnikateľské prostredie',     icon:'💼', c:'#FF9800', p:'sprava'      }, // K14
  { l:'Reforma justície',             icon:'⚖️', c:'#FF7043', p:'sprava'      }, // K15
  { l:'Boj proti korupcii',           icon:'🛡️', c:'#FFC107', p:'sprava'      }, // K16
  { l:'Digitálne Slovensko',          icon:'🖥️', c:'#00BCD4', p:'sprava'      }, // K17
  { l:'Zdravé verejné financie',      icon:'💰', c:'#795548', p:'sprava'      }, // K18
]
function kodMeta(kat) {
  if (!kat) return null
  const k = kat.trim().toUpperCase()
  if (k.startsWith('R')) return { l:'Reformy', icon:'⚖️', c:'#CE93D8', p:'sprava' }
  const m = k.match(/^K(\d+)/)
  if (m) {
    const n = parseInt(m[1], 10)
    if (n > 0 && n < KN_MAP.length && KN_MAP[n]) return KN_MAP[n]
    return { l:`Komponent K${String(n).padStart(2,'0')}`, icon:'📋', c:'#546E7A' }
  }
  return { l: kat, icon:'📋', c:'#546E7A' }
}

// ── Kraj NUTS3 IDs + choropleth farby ─────────────────────────────────────────
const KRAJE = [
  { nuts:'SK010', name:'Bratislavský kraj',   short:'Bratislavský', color:'#5C8AFF' },
  { nuts:'SK021', name:'Trnavský kraj',       short:'Trnavský',     color:'#FF9F43' },
  { nuts:'SK022', name:'Trenčiansky kraj',    short:'Trenčiansky',  color:'#48DBFB' },
  { nuts:'SK023', name:'Nitriansky kraj',     short:'Nitriansky',   color:'#FF6B9D' },
  { nuts:'SK031', name:'Žilinský kraj',       short:'Žilinský',     color:'#1DD1A1' },
  { nuts:'SK032', name:'Banskobystrický kraj',short:'Banskobystrický',color:'#FECA57'},
  { nuts:'SK041', name:'Prešovský kraj',      short:'Prešovský',    color:'#A29BFE' },
  { nuts:'SK042', name:'Košický kraj',        short:'Košický',      color:'#FD79A8' },
]

// ── Obec GPS [lat, lng] — primárna lokalizácia podľa "adresa mesto" ──────────
const OBEC = {
  // Bratislavský kraj
  'Bratislava':[48.1486,17.1077],'Malacky':[48.4350,17.0180],'Pezinok':[48.2900,17.2700],
  'Senec':[48.2200,17.3900],'Stupava':[48.2760,17.0330],'Modra':[48.3350,17.3100],
  'Svätý Jur':[48.2540,17.2190],'Lozorno':[48.3370,17.0910],'Rohožník':[48.3720,17.0590],
  'Záhorská Ves':[48.4080,16.8830],'Gajary':[48.4330,16.9210],'Láb':[48.4590,17.0470],
  'Sološnica':[48.4080,17.1450],'Cerová':[48.4000,17.2060],'Jablonec':[48.3610,17.1680],
  'Cífer':[48.3030,17.4170],'Chorvátsky Grob':[48.2430,17.3540],'Bernolákovo':[48.2060,17.2890],
  'Ivanka pri Dunaji':[48.1710,17.2710],'Malinovo':[48.1070,17.2620],'Šenkvice':[48.3370,17.3830],
  'Marianka':[48.2250,17.0870],'Limbach':[48.3080,17.2440],'Vinosady':[48.3500,17.3010],
  // Trnavský kraj
  'Trnava':[48.3770,17.5880],'Dunajská Streda':[47.9950,17.6200],'Galanta':[48.1880,17.7290],
  'Hlohovec':[48.4300,17.8000],'Piešťany':[48.5880,17.8340],'Senica':[48.6800,17.3680],
  'Skalica':[48.8440,17.2260],'Šaľa':[48.1510,17.8780],'Leopoldov':[48.4470,17.9630],
  'Vrbové':[48.6170,17.7220],'Gbely':[48.7200,17.1290],'Holíč':[48.8100,17.1590],
  'Šaštín-Stráže':[48.7410,17.1490],'Veľké Leváre':[48.5130,16.9980],'Brodské':[48.7020,17.1070],
  'Šamorín':[48.0220,17.3190],'Veľký Meder':[47.8630,17.7570],'Sládkovičovo':[48.2010,17.6680],
  'Sereď':[48.2830,17.7890],'Červeník':[48.4240,17.7720],'Dolná Streda':[48.2020,17.7280],
  'Trstín':[48.4930,17.5410],'Brestovany':[48.3820,17.7200],'Zeleneč':[48.3570,17.5850],
  'Kátlovce':[48.5010,17.7090],'Horná Streda':[48.6900,17.7490],'Radošovce':[48.6940,17.3070],
  'Veľký Kýr':[48.1720,18.0470],'Šintava':[48.2500,17.9000],'Vlčkovce':[48.3090,17.9290],
  // Trenčiansky kraj
  'Trenčín':[48.8930,18.0440],'Bánovce nad Bebravou':[48.7200,18.2600],'Ilava':[48.9980,18.2350],
  'Myjava':[48.7580,17.5650],'Nové Mesto nad Váhom':[48.7550,17.8340],'Partizánske':[48.6280,18.3770],
  'Považská Bystrica':[49.1210,18.4440],'Púchov':[49.1250,18.3290],'Bytča':[49.2230,18.5580],
  'Dubnica nad Váhom':[48.9620,18.1610],'Nová Dubnica':[48.9370,18.1540],'Nemšová':[48.9550,17.9750],
  'Stará Turá':[48.7670,17.6970],'Ladce':[49.0120,18.2750],'Lednické Rovne':[49.0590,18.3130],
  'Beluša':[49.0730,18.3620],'Trenčianske Teplice':[48.9320,18.1520],'Prievidza':[48.7740,18.6230],
  'Handlová':[48.7260,18.7650],'Bojnice':[48.7770,18.5720],'Nováky':[48.7260,18.5310],
  'Chocholná-Velčice':[48.9200,17.9500],'Horné Srnie':[48.9940,17.9090],'Selec':[48.8560,18.1050],
  'Uhrovec':[48.6520,18.2110],'Veľké Uherce':[48.5960,18.2560],'Nitrianske Pravno':[48.7990,18.5240],
  // Nitriansky kraj
  'Nitra':[48.3063,18.0844],'Komárno':[47.7600,18.1270],'Levice':[48.2160,18.6010],
  'Nové Zámky':[47.9850,18.1680],'Topoľčany':[48.5550,18.1700],'Zlaté Moravce':[48.3840,18.3960],
  'Šurany':[48.0850,18.1870],'Štúrovo':[47.7970,18.7150],'Vráble':[48.2430,18.3130],
  'Hurbanovo':[47.8700,18.1960],'Kolárovo':[47.9140,17.9970],'Šahy':[48.0700,18.9490],
  'Želiezovce':[48.0550,18.6600],'Mocenok':[48.2110,17.9060],'Andovce':[47.9750,18.2580],
  'Dvory nad Žitavou':[48.0800,18.2000],'Tlmače':[48.2780,18.6720],'Kalná nad Hronom':[48.2070,18.6880],
  'Nové Zámky':[47.9850,18.1680],'Žitavany':[48.3630,18.3180],'Lužianky':[48.2700,18.0940],
  'Cabaj-Čápor':[48.3580,17.9940],'Veľký Cetín':[48.3160,18.2050],'Pohranice':[48.2870,18.1780],
  'Palárikovo':[48.0200,18.3030],'Beša':[47.8930,18.3460],'Kamenica nad Hronom':[47.9520,18.5060],
  // Žilinský kraj
  'Žilina':[49.2231,18.7393],'Čadca':[49.4360,18.7880],'Dolný Kubín':[49.2120,19.2950],
  'Kysucké Nové Mesto':[49.3010,18.7820],'Liptovský Mikuláš':[49.0840,19.6160],'Martin':[49.0630,18.9220],
  'Námestovo':[49.4060,19.4810],'Ružomberok':[49.0750,19.3070],'Turčianske Teplice':[48.8620,18.8580],
  'Tvrdošín':[49.3400,19.5560],'Liptovský Hrádok':[49.0360,19.7230],'Turany':[49.1110,18.9430],
  'Vrútky':[49.1040,18.9160],'Rajec':[49.0870,18.6230],'Turzovka':[49.4070,18.6220],
  'Krásno nad Kysucou':[49.3730,18.7400],'Oravský Podzámok':[49.2780,19.3200],'Trstená':[49.3600,19.6150],
  'Nižná':[49.3120,19.5250],'Terchová':[49.2600,18.9870],'Strečno':[49.1610,18.8680],
  'Varín':[49.1880,18.8480],'Bytčica':[49.1990,18.6800],'Raková':[49.3620,18.7080],
  'Skalité':[49.4310,18.8980],'Oščadnica':[49.3790,18.8750],'Stará Bystrica':[49.3560,18.6750],
  'Belá':[49.2330,19.5450],'Zuberec':[49.2670,19.5780],'Brestová':[49.1660,18.7950],
  'Liptovská Osada':[48.9770,19.4070],'Liptovský Ján':[49.0070,19.6030],'Pribylina':[49.1080,19.8400],
  'Dúbrava':[49.0580,19.3720],'Partizánska Ľupča':[49.1060,19.4420],'Hubová':[49.0520,19.2940],
  'Dolná Lehota':[48.8400,19.5270],'Brezno':[48.8060,19.6410],
  // Banskobystrický kraj
  'Banská Bystrica':[48.7355,19.1530],'Banská Štiavnica':[48.4600,18.8970],
  'Detva':[48.5590,19.4210],'Krupina':[48.3560,19.0690],'Lučenec':[48.3320,19.6680],
  'Poltár':[48.4300,19.7950],'Revúca':[48.6840,20.1120],'Rimavská Sobota':[48.3800,20.0180],
  'Veľký Krtíš':[48.2100,19.3510],'Zvolen':[48.5760,19.1280],'Žiar nad Hronom':[48.5880,18.8540],
  'Fiľakovo':[48.2760,19.8300],'Tisovec':[48.6790,19.9490],'Hnúšťa':[48.5780,19.9860],
  'Tornaľa':[48.4180,20.3270],'Jesenské':[48.3000,20.0780],'Jelšava':[48.6280,20.2360],
  'Muráň':[48.7340,19.9880],'Kokava nad Rimavicou':[48.5300,19.9090],'Lovinobaňa':[48.3670,19.7000],
  'Nová Baňa':[48.4240,18.6460],'Žarnovica':[48.4880,18.7070],'Kremnica':[48.7040,18.9180],
  'Modrý Kameň':[48.2300,19.5070],'Modry Kamen':[48.2300,19.5070],'Šalgótarján':null,
  'Pliešovce':[48.4550,19.2050],'Sliač':[48.7200,19.1430],'Vígľaš':[48.5280,19.3200],
  'Hriňová':[48.5970,19.5200],'Lieskovec':[48.6760,19.1140],'Kováčová':[48.6400,19.1650],
  'Predajná':[48.8370,19.4140],'Č. Balog':[48.7290,19.7280],'Čierny Balog':[48.7290,19.7280],
  'Hnilec':[48.8600,20.2500],'Dobšiná':[48.8200,20.3770],'Štítnik':[48.6430,20.3450],
  // Prešovský kraj
  'Prešov':[48.9990,21.2390],'Bardejov':[49.2960,21.2750],'Humenné':[48.9340,21.9080],
  'Kežmarok':[49.1350,20.4310],'Levoča':[49.0230,20.5920],'Medzilaborce':[49.2700,21.9000],
  'Poprad':[49.0560,20.2980],'Sabinov':[49.1010,21.0990],'Snina':[48.9880,22.1490],
  'Stará Ľubovňa':[49.3020,20.6890],'Stropkov':[49.2040,21.6500],'Vranov nad Topľou':[48.8800,21.6880],
  'Spišská Nová Ves':[48.9450,20.5700],'Spišská Belá':[49.1780,20.4540],'Podolínec':[49.2500,20.5280],
  'Lipany':[49.1580,20.9760],'Giraltovce':[49.1100,21.5220],'Hanušovce nad Topľou':[48.9260,21.5290],
  'Spišské Podhradie':[49.0000,20.7570],'Krompachy':[48.9130,20.8760],'Smižany':[48.9440,20.5420],
  'Vrbov':[49.1030,20.3980],'Spišská Stará Ves':[49.3880,20.4310],'Svit':[49.0420,20.2010],
  'Vysoké Tatry':[49.1550,20.1210],'Tatranská Lomnica':[49.1580,20.2760],'Štrbské Pleso':[49.1200,20.0600],
  'Stará Lesná':[49.1470,20.2820],'Spišské Vlachy':[48.9830,20.7710],'Spišský Štvrtok':[49.0400,20.6250],
  'Slovenská Ves':[49.2080,20.5730],'Ľubica':[49.1540,20.4950],'Vrbov':[49.1030,20.3980],
  'Nižný Hrušov':[48.8720,21.6550],'Medzany':[48.8210,21.0830],'Prešov':[48.9990,21.2390],
  'Veľký Šariš':[49.0630,21.2290],'Ľutina':[49.0050,21.3990],'Raslavice':[49.2640,21.1260],
  'Kamenica':[49.0880,21.3840],'Lemešany':[48.9520,21.3470],'Kendice':[49.0380,21.1800],
  'Župčany':[49.0680,21.4180],'Hermanovce':[49.0970,21.3420],'Čelovce':[49.0250,21.5720],
  'Trebejov':[48.9260,21.4310],'Brestov':[49.0450,21.4720],'Rokycany':[49.2520,21.6470],
  'Breznica':[49.1700,21.6330],
  'Tisinec':[49.1510,21.6050],'Sitník':[49.2150,21.6290],'Miková':[49.2620,21.8640],
  'Kolbovce':[49.1960,21.6450],'Medzilaborce':[49.2700,21.9000],'Ohradzany':[49.1250,21.6050],
  'Kružlová':[49.2360,21.6260],'Vladiča':[49.2780,21.5820],'Ptičie':[49.2510,21.5460],
  'Vojtovce':[49.1690,21.5800],'Havaj':[49.1470,21.5750],'Bystrá':[49.1220,21.5880],
  'Chotča':[49.1900,21.4860],'Poša':[49.0020,21.6220],'Rudlov':[49.0410,21.6730],
  'Hankovce':[49.0680,21.6480],'Zbudské Dlhé':[48.9560,22.0070],'Topoľa':[49.0410,22.0700],
  'Stakčín':[48.9860,22.3120],'Ubľa':[48.8950,22.3480],'Ruský Hrabovec':[48.8990,22.0990],
  'Vyšný Hrušov':[48.8320,21.7140],'Nižný Kručov':[48.8590,21.8870],'Hažín':[48.8460,21.9150],
  // Košický kraj
  'Košice':[48.7163,21.2611],'Gelnica':[48.8560,20.9350],'Michalovce':[48.7540,21.9200],
  'Rožňava':[48.6600,20.5280],'Sobrance':[48.7440,22.1810],'Trebišov':[48.6270,21.7180],
  'Moldava nad Bodvou':[48.6160,20.9950],'Jasov':[48.6530,21.0680],'Turňa nad Bodvou':[48.5780,20.8560],
  'Streda nad Bodrogom':[48.3870,21.8380],'Veľké Kapušany':[48.5530,22.0750],
  'Kráľovský Chlmec':[48.4290,21.9790],'Čierna nad Tisou':[48.4190,22.3270],
  'Vranov nad Topľou':[48.8800,21.6880],'Sečovce':[48.6980,21.6690],
  'Kalša':[48.6840,21.1540],'Košická Belá':[48.7640,20.8740],'Smolník':[48.7360,20.7200],
  'Medzev':[48.7100,20.8910],'Štós':[48.6870,20.8240],'Rudník':[48.7900,20.9870],
  'Čečejovce':[48.6000,21.2260],'Bukovec':[48.6800,21.3450],'Šaca':[48.6630,21.2610],
  'Haniska':[48.6810,21.1960],'Bočiar':[48.5910,21.2440],'Kysak':[48.8180,21.0670],
  'Rudohorie':[48.8380,20.9340],'Nižný Medzev':[48.7200,20.8680],'Štítnik':[48.6430,20.3450],
}

// ── Okres centroids [lat, lng] ────────────────────────────────────────────────
const OKRES = {
  'Bratislava I':[48.1439,17.1097],'Bratislava II':[48.1500,17.1600],
  'Bratislava III':[48.1850,17.1200],'Bratislava IV':[48.1900,17.0400],
  'Bratislava V':[48.0700,17.1300],'Malacky':[48.4350,17.0180],
  'Pezinok':[48.2900,17.2700],'Senec':[48.2200,17.3900],
  'Dunajská Streda':[47.9950,17.6200],'Galanta':[48.1880,17.7290],
  'Hlohovec':[48.4300,17.8000],'Piešťany':[48.5880,17.8340],
  'Senica':[48.6800,17.3680],'Skalica':[48.8440,17.2260],
  'Trnava':[48.3770,17.5880],'Bánovce nad Bebravou':[48.7200,18.2600],
  'Ilava':[48.9980,18.2350],'Myjava':[48.7580,17.5650],
  'Nové Mesto nad Váhom':[48.7550,17.8340],'Partizánske':[48.6280,18.3770],
  'Považská Bystrica':[49.1210,18.4440],'Púchov':[49.1250,18.3290],
  'Trenčín':[48.8930,18.0440],'Komárno':[47.7600,18.1270],
  'Levice':[48.2160,18.6010],'Nitra':[48.3063,18.0844],
  'Nové Zámky':[47.9850,18.1680],'Šaľa':[48.1510,17.8780],
  'Topoľčany':[48.5550,18.1700],'Zlaté Moravce':[48.3840,18.3960],
  'Bytča':[49.2230,18.5580],'Čadca':[49.4360,18.7880],
  'Dolný Kubín':[49.2120,19.2950],'Kysucké Nové Mesto':[49.3010,18.7820],
  'Liptovský Mikuláš':[49.0840,19.6160],'Martin':[49.0630,18.9220],
  'Námestovo':[49.4060,19.4810],'Ružomberok':[49.0750,19.3070],
  'Turčianske Teplice':[48.8620,18.8580],'Tvrdošín':[49.3400,19.5560],
  'Žilina':[49.2231,18.7393],'Banská Bystrica':[48.7355,19.1530],
  'Banská Štiavnica':[48.4600,18.8970],'Brezno':[48.8060,19.6410],
  'Detva':[48.5590,19.4210],'Krupina':[48.3560,19.0690],
  'Lučenec':[48.3320,19.6680],'Poltár':[48.4300,19.7950],
  'Revúca':[48.6840,20.1120],'Rimavská Sobota':[48.3800,20.0180],
  'Veľký Krtíš':[48.2100,19.3510],'Zvolen':[48.5760,19.1280],
  'Žiar nad Hronom':[48.5880,18.8540],'Bardejov':[49.2960,21.2750],
  'Humenné':[48.9340,21.9080],'Kežmarok':[49.1350,20.4310],
  'Levoča':[49.0230,20.5920],'Medzilaborce':[49.2700,21.9000],
  'Poprad':[49.0560,20.2980],'Prešov':[48.9980,21.2390],
  'Sabinov':[49.1010,21.0990],'Snina':[48.9880,22.1490],
  'Stará Ľubovňa':[49.3020,20.6890],'Stropkov':[49.2040,21.6500],
  'Vranov nad Topľou':[48.8800,21.6880],'Gelnica':[48.8560,20.9350],
  'Košice I':[48.7163,21.2611],'Košice II':[48.7000,21.2900],
  'Košice III':[48.7300,21.3100],'Košice IV':[48.6800,21.2200],
  'Košice-okolie':[48.6500,21.1500],'Michalovce':[48.7540,21.9200],
  'Rožňava':[48.6600,20.5280],'Sobrance':[48.7440,22.1810],
  'Spišská Nová Ves':[48.9450,20.5700],'Trebišov':[48.6270,21.7180],
}

// ── Stav metadata ─────────────────────────────────────────────────────────────
const STAV_META = {
  PROJEKT_UKONCENY:                { c:'#4CAF50', l:'Ukončený' },
  PROJEKT_V_REALIZACII:            { c:'#2196F3', l:'V realizácii' },
  ZMLUVA_UZAVRETA:                 { c:'#FF9800', l:'Zmluva uzavretá' },
  ZAZMLUVNENY:                     { c:'#FF9800', l:'Zazmluvnený' },
  ZIADOST_SCHVALENA:               { c:'#9C27B0', l:'Žiadosť schválená' },
  SCHVALENY:                       { c:'#9C27B0', l:'Schválený' },
  ZIADOST_PODANA:                  { c:'#607D8B', l:'Žiadosť podaná' },
  PROJEKT_ZRUSENY:                 { c:'#f44336', l:'Zrušený' },
  ZRUSENY:                         { c:'#f44336', l:'Zrušený' },
  PREDPRIPRAVENY:                  { c:'#FDD835', l:'Predpripravený' },
  NESTANDARDNE_UKONCENIE_PROJEKTU: { c:'#FF5722', l:'Nest. ukončenie' },
  ODSTUPENIE_OD_ZMLUVY:            { c:'#FF7043', l:'Odstúpenie od zmluvy' },
  CIASTOCNE_VYPLATENY:             { c:'#00BCD4', l:'Čiastočne vyplatený' },
  VYPLATENY:                       { c:'#4CAF50', l:'Vyplatený' },
  CAKAJUCE_NA_PLATBU:              { c:'#FFCA28', l:'Čakajúce na platbu' },
  NESCHVALENY:                     { c:'#E53935', l:'Neschválený' },
  ZAMIETNUTA:                      { c:'#E53935', l:'Zamietnutá' },
  ZAMIETNUTA_ZIADOST:              { c:'#E53935', l:'Zamietnutá žiadosť' },
  NOVY:                            { c:'#26C6DA', l:'Nový' },
  UZAVRETY:                        { c:'#26C6DA', l:'Uzavretý' },
  NEZNAMY:                         { c:'#546E7A', l:'Neznámy' },
}

// ── CP1250 → UTF-8 oprava mojibake (PowerShell double-encoding) ───────────────
const _CP1250 = [
  0x20AC,0,0x201A,0,0x201E,0x2026,0x2020,0x2021,0,0x2030,0x0160,0x2039,0x015A,0x0164,0x017D,0x0179,
  0,0x2018,0x2019,0x201C,0x201D,0x2022,0x2013,0x2014,0,0x2122,0x0161,0x203A,0x015B,0x0165,0x017E,0x017A,
  0x00A0,0x02C7,0x02D8,0x0141,0x00A4,0x0104,0x00A6,0x00A7,0x00A8,0x00A9,0x015E,0x00AB,0x00AC,0x00AD,0x00AE,0x017B,
  0x00B0,0x00B1,0x02DB,0x0142,0x00B4,0x00B5,0x00B6,0x00B7,0x00B8,0x0105,0x015F,0x00BB,0x013D,0x02DD,0x013E,0x017C,
  0x0154,0x00C1,0x00C2,0x0102,0x00C4,0x0139,0x0106,0x00C7,0x010C,0x00C9,0x0118,0x00CB,0x011A,0x00CD,0x00CE,0x010E,
  0x0110,0x0143,0x0147,0x00D3,0x00D4,0x0150,0x00D6,0x00D7,0x0158,0x016E,0x00DA,0x0170,0x00DC,0x00DD,0x0162,0x00DF,
  0x0155,0x00E1,0x00E2,0x0103,0x00E4,0x013A,0x0107,0x00E7,0x010D,0x00E9,0x0119,0x00EB,0x011B,0x00ED,0x00EE,0x010F,
  0x0111,0x0144,0x0148,0x00F3,0x00F4,0x0151,0x00F6,0x00F7,0x0159,0x016F,0x00FA,0x0171,0x00FC,0x00FD,0x0163,0x02D9
]
const _CP1250R = new Map()
for (let b = 0; b < 128; b++) _CP1250R.set(b, b)
_CP1250.forEach((cp, i) => { if (cp) _CP1250R.set(cp, 0x80 + i) })

function fixMojibake(s) {
  if (!s || typeof s !== 'string') return s
  let hasTell = false
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i)
    if (c > 0xFF && _CP1250R.has(c)) { hasTell = true; break }
  }
  if (!hasTell) return s
  try {
    const bytes = new Uint8Array(s.length)
    for (let i = 0; i < s.length; i++)
      bytes[i] = _CP1250R.get(s.charCodeAt(i)) ?? (s.charCodeAt(i) & 0xFF)
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch { return s }
}

function normStav(s) {
  return (s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toUpperCase().trim().replace(/\s+/g,'_')
}
function stavMeta(stav) {
  return STAV_META[normStav(stav)] || { c:'#546E7A', l: stav || 'Neznámy' }
}

function fmt(n) {
  const v = parseFloat(n)
  if (!v && v !== 0) return '—'
  if (v >= 1e9) return (v/1e9).toLocaleString('sk-SK',{minimumFractionDigits:2,maximumFractionDigits:2}) + ' mld. €'
  if (v >= 1e6) return (v/1e6).toLocaleString('sk-SK',{minimumFractionDigits:2,maximumFractionDigits:2}) + ' M €'
  if (v >= 1e3) return (v/1e3).toLocaleString('sk-SK',{maximumFractionDigits:1}) + ' tis. €'
  return v.toLocaleString('sk-SK') + ' €'
}

// ── ASCII-normalize kľúč — odstráni diakritiku, lowercase ────────────────────
function normKeyA(k) {
  return (k || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

// ── Robustný getter — skúša presný kľúč aj ASCII-normalizovaný fallback ───────
function g(p, ...keys) {
  for (const k of keys) {
    let v = p[k]
    if (v != null && v !== '' && v !== 'N' && v !== 'null')
      return typeof v === 'number' ? v : String(v)
    // Fallback: ASCII-normalizovaný kľúč (rieši NFD/NFC mismatch)
    v = p[normKeyA(k)]
    if (v != null && v !== '' && v !== 'N' && v !== 'null')
      return typeof v === 'number' ? v : String(v)
  }
  return ''
}

// Právna forma → entity typ (priame mapovanie z JSON poľa)
const PRAVNA_FORMA_MAP = [
  [/spoločnosť s ručením obmedzeným|s\.r\.o/i,  { icon:'🏢', label:'s.r.o.', cls:'entity-sro' }],
  [/akciová spoločnosť|a\.s\./i,                 { icon:'🏦', label:'a.s.', cls:'entity-as' }],
  [/štátny podnik|štátna organizácia|príspevková organizácia|rozpočtová organizácia/i,
                                                  { icon:'🏛️', label:'Štátna org.', cls:'entity-stat' }],
  [/obec|mesto|samosprávny kraj|vyšší územný celok/i,
                                                  { icon:'🏙️', label:'Samospráva', cls:'entity-samo' }],
  [/verejnoprávna|verejná výskumná/i,             { icon:'🎓', label:'Verejná inštitúcia', cls:'entity-edu' }],
  [/fyzická osoba - podnikateľ|živnostník/i,      { icon:'👷', label:'Živnostník / SZČO', cls:'entity-szco' }],
  [/fyzická osoba|^fo$/i,                         { icon:'👤', label:'Fyzická osoba', cls:'entity-fyzicka' }],
  [/občianske združenie|nezisková|nadácia|cirkev|neinvestičný fond/i,
                                                  { icon:'🤝', label:'Nezisková org.', cls:'entity-ngo' }],
  [/družstvo/i,                                   { icon:'🤝', label:'Družstvo', cls:'entity-ngo' }],
  [/komanditná spoločnosť|verejná obchodná/i,     { icon:'🏢', label:'Osobná spol.', cls:'entity-sro' }],
]

function entityInfo(name, pravnaForma) {
  // Prednostne podľa právnej formy (priame pole z JSON)
  if (pravnaForma) {
    for (const [re, meta] of PRAVNA_FORMA_MAP) {
      if (re.test(pravnaForma)) return meta
    }
    // Ak právna forma existuje ale nerozoznali sme → Právnická osoba
    return { icon:'🏢', label:'Právnická osoba', cls:'entity-sro' }
  }
  // Fallback — regex na mene
  if (!name) return { icon:'👤', label:'Fyzická osoba', cls:'entity-fyzicka' }
  if (/\bs\.r\.o|spol\. s r\.o/i.test(name))   return { icon:'🏢', label:'s.r.o.', cls:'entity-sro' }
  if (/\ba\.s\.\b|\bakcio/i.test(name))         return { icon:'🏦', label:'a.s.', cls:'entity-as' }
  if (/ministerstvo|úrad vlády|štátna|agentúra|fond|inšpektorát/i.test(name))
    return { icon:'🏛️', label:'Štátna inštitúcia', cls:'entity-stat' }
  if (/obec |mesto |mestská |obecný |kraj|samosprávny/i.test(name))
    return { icon:'🏙️', label:'Samospráva', cls:'entity-samo' }
  if (/škola|gymnázium|univerzita|fakulta|akadémia|výskumný|ústav/i.test(name))
    return { icon:'🎓', label:'Vzdelávanie', cls:'entity-edu' }
  if (/nemocnica|zdravotn|poliklinika|klinika/i.test(name))
    return { icon:'🏥', label:'Zdravotníctvo', cls:'entity-health' }
  if (/o\.z\.|n\.o\.|n\.f\.|združenie|nadácia|spolok|cirkev/i.test(name))
    return { icon:'🤝', label:'Nezisková org.', cls:'entity-ngo' }
  return { icon:'🏢', label:'Právnická osoba', cls:'entity-sro' }
}

// ── Popup HTML ─────────────────────────────────────────────────────────────────
function makePopup(p, meta, color) {
  const okres   = g(p,'okres','Okres')
  const kraj    = g(p,'kraj','Kraj')
  const kat     = g(p,'kód investície / reformy','kod investicie','kod')
  const km      = kodMeta(kat)
  const nazov   = g(p,'názov projektu','nazov projektu','nazov','name')
  const vyzva   = g(p,'názov výzvy','nazov vyzvy')
  const meno    = g(p,'prijímateľ meno a priezvisko / názov',
                     'žiadateľ meno a priezvisko / názov',
                     'ziadatel meno a priezvisko / nazov','ziadatel')
  const _icoRaw    = g(p,'prijímateľ ičo','žiadateľ ičo','ziadatel ico','ico')
  const ico        = /^\d{6,10}$/.test((_icoRaw||'').trim()) ? _icoRaw.trim() : ''
  const icDph      = g(p,'prijímateľ ič dph','žiadateľ ič dph').trim()
  const dic        = g(p,'prijímateľ dič','žiadateľ dič')
  const pravnaForma= g(p,'prijímateľ právna forma','žiadateľ právna forma','právna forma')
  const postavenie = g(p,'prijímateľ postavenie','žiadateľ postavenie')
  const datumPred  = g(p,'dátum predloženia žiadosti','datum predlozenia ziadosti')
  const link       = g(p,'link crz','link_crz')
  const datum      = g(p,'dátum uzavretia zmluvy','datum uzavretia zmluvy','datum_zmluvy','datum zmluvy')
  const datumCrz   = g(p,'dátum crz','datum crz')
  const cislo      = g(p,'číslo zmluvy','cislo zmluvy')
  const ent        = entityInfo(meno, pravnaForma)

  const poo        = parseFloat(g(p,'poskytnuté poo €','poskytnuté poo','zazmluvnená suma zdroj poo','poo_suma')) || 0
  const pooZuc     = parseFloat(g(p,'zúčtované poo €','zuctovane poo','zuctovane_poo')) || 0
  const celk       = parseFloat(g(p,'celková suma projektu','celkova suma projektu','celkova_suma')) || 0
  const pozad      = parseFloat(g(p,'požadovaná suma','požadovaná suma bez dph','pozadovana suma')) || 0
  const pozadDph   = parseFloat(g(p,'požadovaná suma z toho dph','pozadovana suma z toho dph')) || 0

  const kodVyzvy  = g(p,'kód výzvy','kod vyzvy')
  const kodZiad   = g(p,'kód žiadosti','kód projektu','kod projektu','kod ziadosti')
  const posudenie = g(p,'posúdenie výsledok','posudenie vysledok')
  const evidencna = g(p,'projekt evidenčnej výzvy','projekt evidencnej vyzvy')

  const mainSum = poo || pozad || celk

  const posLabel = {
    PRIJIMATEL: '✅ Príjemca', ZIADATEL: '📋 Žiadateľ',
    PLATCA: '💳 Platca', PARTNER: '🤝 Partner',
  }[postavenie] || postavenie

  return `
    <div class="pc">
      <div class="pc-head" style="border-left:3px solid ${color}">
        <span class="pc-badge" style="background:${color}22;color:${color}">${meta.l}</span>
        <span class="pc-ent ${ent.cls}">${ent.icon} ${ent.label}</span>
      </div>
      ${nazov ? `<div class="pc-title">${nazov}</div>` : ''}
      ${vyzva && vyzva !== nazov ? `<div class="pc-vyzva">${vyzva}</div>` : ''}
      ${km ? `<div class="pc-area-badge" style="background:${km.c}18;border-color:${km.c}44;color:${km.c}">${km.icon} ${km.l}</div>` : ''}

      ${meno || pravnaForma ? `
        <div class="pc-entity">
          <span class="pc-entity-lbl">${posLabel || 'Príjemca / Žiadateľ'}</span>
          ${meno ? `<span class="pc-entity-val">${meno}</span>` : ''}
          ${pravnaForma ? `<span class="pc-entity-forma">${pravnaForma}</span>` : ''}
          ${ico ? `<span class="pc-entity-ico">
            IČO: <b>${ico}</b>
            · <a href="https://www.finstat.sk/${ico}" target="_blank" rel="noopener">FinStat</a>
            · <a href="https://orsr.sk/hladaj_ico.asp?ico=${ico}" target="_blank" rel="noopener">ORSR</a>
          </span>` : ''}
          ${icDph ? `<span class="pc-entity-ico">IČ DPH: ${icDph}${dic ? ' · DIČ: '+dic : ''}</span>` : ''}
        </div>` : ''}

      <div class="pc-rows">
        <div class="pc-row"><span>Lokalita</span><b>${okres}${kraj ? ' · ' + kraj.replace(' kraj','') : ''}</b></div>
        ${kat ? `<div class="pc-row"><span>Kód invest.</span><b>${kat}</b></div>` : ''}
        ${kodVyzvy  ? `<div class="pc-row"><span>Kód výzvy</span><b>${kodVyzvy}</b></div>` : ''}
        ${kodZiad   ? `<div class="pc-row"><span>Kód žiadosti</span><b>${kodZiad}</b></div>` : ''}
        ${datumPred ? `<div class="pc-row"><span>Podaná</span><b>${datumPred}</b></div>` : ''}
        ${posudenie ? `<div class="pc-row pc-posudenie"><span>Posúdenie</span><b class="${posudenie==='SPLNENE_PODMIENKY'?'pc-ok':'pc-nok'}">${posudenie==='SPLNENE_PODMIENKY'?'✓ Splnené podmienky':posudenie}</b></div>` : ''}
        ${evidencna && evidencna==='N' ? '' : evidencna ? `<div class="pc-row"><span>Evidenčná výzva</span><b>${evidencna}</b></div>` : ''}
        ${poo  > 0 ? `<div class="pc-row pc-money"><span>Poskytnuté POO</span><b>${fmt(poo)}</b></div>` : ''}
        ${pooZuc>0 ? `<div class="pc-row"><span>Zúčtované POO</span><b>${fmt(pooZuc)}</b></div>` : ''}
        ${pozad > 0 ? `<div class="pc-row"><span>Požadovaná suma</span><b>${fmt(pozad)}${pozadDph?` <small>(DPH: ${fmt(pozadDph)})</small>`:''}</b></div>` : ''}
        ${celk  > 0 ? `<div class="pc-row pc-money"><span>Celková suma</span><b>${fmt(celk)}</b></div>` : ''}
        ${datum ? `<div class="pc-row"><span>Uzavretie zmluvy</span><b>${datum}</b></div>` : ''}
        ${datumCrz ? `<div class="pc-row"><span>Dátum CRZ</span><b>${datumCrz}</b></div>` : ''}
        ${cislo ? `<div class="pc-row"><span>Číslo zmluvy</span><b style="font-size:10px">${cislo}</b></div>` : ''}
      </div>

      ${mainSum > 0 ? `
        <div class="pc-bar-wrap">
          <div class="pc-bar-track">
            <div class="pc-bar-fill" style="width:${poo&&celk?Math.min(100,(poo/celk)*100):100}%;background:${color}"></div>
          </div>
          <div class="pc-bar-labels">
            <span>POO: ${fmt(poo||pozad)}</span>
            ${celk>0?`<span>Celkom: ${fmt(celk)}</span>`:''}
          </div>
        </div>` : ''}
      ${link ? `<a class="pc-btn" href="${link}" target="_blank" rel="noopener">📄 Zmluva CRZ →</a>` : ''}
    </div>`
}

// ── Heatmap — hustota projektov per okres (žiadne extra balíčky) ──────────────
function buildHeatLayer(projects) {
  const counts = {}
  projects.forEach(p => {
    const o = g(p,'okres','Okres')
    if (o && OKRES[o]) counts[o] = (counts[o]||0)+1
  })
  const vals = Object.values(counts)
  if (!vals.length) return L.layerGroup()
  const max = Math.max(...vals)
  const circles = Object.entries(counts).map(([name, cnt]) => {
    const ratio = cnt / max
    const [lat, lng] = OKRES[name]
    const radius = 8000 + ratio * 55000
    // Farebný gradient: málo=modrá, stred=zelená, veľa=červená
    const hue = Math.round(240 - ratio * 240)
    const col = `hsl(${hue},85%,58%)`
    return L.circle([lat, lng], {
      radius,
      color: 'transparent',
      fillColor: col,
      fillOpacity: 0.18 + ratio * 0.38,
      interactive: false,
    })
  })
  return L.layerGroup(circles)
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const mapRef     = useRef(null)
  const leafletRef = useRef(null)
  const layersRef  = useRef({ kraje: null, markers: null, heat: null })
  const byKrajRef  = useRef({})

  const [data,      setData]      = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)

  // ── Easter egg ───────────────────────────────────────────────────────────────
  const [eggClicks,  setEggClicks]  = useState(0)
  const [eggVisible, setEggVisible] = useState(false)
  const eggTimerRef = useRef(null)
  const EGG_ICONS = ['🏥','👨‍⚕️','💊','🚑','🩺','❤️','🫀','🧬','💉','🩻']
  const handleEggClick = () => {
    setEggClicks(c => {
      const next = c + 1
      if (next >= 5) {
        setEggVisible(true)
        clearTimeout(eggTimerRef.current)
        eggTimerRef.current = setTimeout(() => { setEggVisible(false); setEggClicks(0) }, 3500)
        return 0
      }
      return next
    })
  }

  const [filterKraj,   setFilterKraj]   = useState('all')
  const [filterStav,   setFilterStav]   = useState('all')
  const [filterKat,    setFilterKat]    = useState('all')
  const [filterEntity,    setFilterEntity]    = useState('all')
  const [filterPostavenie,setFilterPostavenie] = useState('all') // 'all' | 'PRIJIMATEL' | 'PARTNER' | 'ZIADATEL'
  const [showKraje,    setShowKraje]    = useState(true)
  const [heatMode,     setHeatMode]     = useState(false)
  const [krajView,     setKrajView]     = useState('count') // 'count' | 'suma'
  const [tileMode,     setTileMode]     = useState('dark')  // 'dark' | 'light'
  const tileLayerRef = useRef(null)

  // ── Načítaj JSON ─────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/planobnovy.json')
      .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.arrayBuffer() })
      .then(buf => {
        const text = new TextDecoder('utf-8').decode(buf)
        const clean = text.replace(/^﻿/, '')
        const raw = JSON.parse(clean)
        const rawArr = Array.isArray(raw) ? raw : raw.data || Object.values(raw)[0] || []
        const arr = rawArr.map(p => {
          const out = {}
          for (const [k, v] of Object.entries(p)) {
            const fixedKey = fixMojibake(k).normalize('NFC')
            const val = typeof v === 'string' ? fixMojibake(v) : v
            out[fixedKey] = val
            // Uložíme aj ASCII-normalizovaný kľúč ako fallback (NFD/NFC mismatch fix)
            const nk = normKeyA(fixedKey)
            if (nk !== fixedKey) out[nk] = val
          }
          return out
        })
        // Debug: vypíšeme kľúče prvého záznamu pre overenie
        if (arr.length > 0) {
          console.log('[POO] Prvý záznam kľúče:', Object.keys(arr[0]).slice(0,10))
          console.log('[POO] pravna forma prvého:', arr[0]['prijímateľ právna forma'] || arr[0][normKeyA('prijímateľ právna forma')] || 'NENÁJDENÁ')
        }
        setData(arr)
        setLoading(false)
      })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  // ── Init Leaflet ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || leafletRef.current) return

    const map = L.map(mapRef.current, {
      center: [48.7, 19.5], zoom: 7,
      zoomControl: false,
      attributionControl: true,
    })
    L.control.zoom({ position:'topright' }).addTo(map)

    // Tile layer — dark predvolene, prepnuteľné
    tileLayerRef.current = L.tileLayer(
      'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png', {
        attribution: '© <a href="https://stadiamaps.com/">Stadia Maps</a> © <a href="https://openstreetmap.org/copyright">OSM</a>',
        maxZoom: 20,
      }).addTo(map)
    leafletRef.current = map

    // ── Kraj hranice z Eurostat GISCO NUTS3 ────────────────────────────────────
    fetch('https://gisco-services.ec.europa.eu/distribution/v2/nuts/geojson/NUTS_RG_03M_2021_4326_LEVL_3.geojson')
      .then(r => r.json())
      .then(geo => {
        const sk = geo.features.filter(f => f.properties.NUTS_ID?.startsWith('SK'))
        const layer = L.geoJSON(sk, {
          style(f) {
            const k = KRAJE.find(k => k.nuts === f.properties.NUTS_ID)
            const cnt = byKrajRef.current[k?.name] || 0
            const max = Math.max(...Object.values(byKrajRef.current), 1)
            return {
              color:       '#ffffff22',
              weight:      1.5,
              fillColor:   k?.color || '#7DAA6C',
              fillOpacity: 0.06 + (cnt/max) * 0.38,
            }
          },
          onEachFeature(f, layer) {
            const k = KRAJE.find(k => k.nuts === f.properties.NUTS_ID)
            layer.bindTooltip(`<b>${k?.name || f.properties.NAME_LATN}</b>`,
              { sticky:true, className:'kraj-tooltip' })
          },
        }).addTo(map)
        layersRef.current.kraje = layer
      })
      .catch(() => {
        console.warn('GISCO nedostupné')
      })

    // ── MarkerClusterGroup ─────────────────────────────────────────────────────
    const mcg = L.markerClusterGroup({
      maxClusterRadius: 45,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      iconCreateFunction(cluster) {
        const n = cluster.getChildCount()
        const size = n > 1000 ? 56 : n > 100 ? 46 : 38
        const all = cluster.getAllChildMarkers()
        const sample = all.length > 60 ? all.slice(0, 60) : all
        const counts = {}
        sample.forEach(m => { const c = m.options.color||'#546E7A'; counts[c]=(counts[c]||0)+1 })
        const dom = Object.entries(counts).sort((a,b)=>b[1]-a[1])[0]?.[0] || '#3a6a9c'
        const label = n > 9999 ? Math.round(n/1000)+'k' : n > 999 ? (n/1000).toFixed(1)+'k' : n
        return L.divIcon({
          html: `<div class="cl-icon" style="width:${size}px;height:${size}px;line-height:${size}px;border-color:${dom};box-shadow:0 0 20px ${dom}66,0 0 6px ${dom}33,0 2px 8px rgba(0,0,0,.7);color:${dom}">${label}</div>`,
          className:'', iconSize:[size,size],
        })
      },
    }).addTo(map)
    layersRef.current.markers = mcg

    return () => { map.remove(); leafletRef.current = null }
  }, [])

  // ── Toggle kraj vrstvy ───────────────────────────────────────────────────────
  useEffect(() => {
    const map = leafletRef.current
    if (!map || !layersRef.current.kraje) return
    showKraje ? map.addLayer(layersRef.current.kraje) : map.removeLayer(layersRef.current.kraje)
  }, [showKraje])

  // ── Prepínač tiles dark / light ──────────────────────────────────────────────
  useEffect(() => {
    const map = leafletRef.current
    if (!map) return
    if (tileLayerRef.current) map.removeLayer(tileLayerRef.current)
    const TILES = {
      dark: {
        url: 'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png',
        attr: '© <a href="https://stadiamaps.com/">Stadia Maps</a> © <a href="https://openstreetmap.org/copyright">OSM</a>',
      },
      light: {
        url: 'https://tiles.stadiamaps.com/tiles/outdoors/{z}/{x}/{y}{r}.png',
        attr: '© <a href="https://stadiamaps.com/">Stadia Maps</a> © <a href="https://openstreetmap.org/copyright">OSM</a>',
      },
    }
    const t = TILES[tileMode] || TILES.dark
    tileLayerRef.current = L.tileLayer(t.url, { attribution: t.attr, maxZoom: 20 }).addTo(map)
    // Posuň tile layer pod všetky ostatné vrstvy
    tileLayerRef.current.bringToBack()
  }, [tileMode])

  // ── Filtrované dáta ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => data.filter(p => {
    const kraj       = g(p,'kraj','Kraj')
    const stav       = normStav(g(p,'stav projektu','stav'))
    const kat        = g(p,'kód investície / reformy','kod investicie','kod')
    const meno       = g(p,'prijímateľ meno a priezvisko / názov','žiadateľ meno a priezvisko / názov','ziadatel')
    const pravnaForma= g(p,'prijímateľ právna forma','žiadateľ právna forma','pravna forma','právna forma')
    const ent        = entityInfo(meno, pravnaForma)
    if (filterKraj   !== 'all' && !kraj.includes(filterKraj))   return false
    if (filterStav   !== 'all' && stav !== filterStav)           return false
    if (filterKat    !== 'all' && !kat.startsWith(filterKat))    return false
    if (filterEntity !== 'all' && ent.label !== filterEntity)    return false
    if (filterPostavenie !== 'all') {
      const pos = normStav(g(p,'prijímateľ postavenie','žiadateľ postavenie','prijimatel postavenie','ziadatel postavenie'))
      if (pos !== filterPostavenie) return false
    }
    return true
  }), [data, filterKraj, filterStav, filterKat, filterEntity, filterPostavenie])

  // ── Markery — bulk addLayers ─────────────────────────────────────────────────
  useEffect(() => {
    const mcg = layersRef.current.markers
    if (!mcg) return
    mcg.clearLayers()
    if (heatMode) return  // v heatmap móde neskrývame ale neplníme clustery
    const markers = []
    filtered.forEach((p, idx) => {
      const okres = g(p,'okres','Okres')
      const obec  = g(p,'prijímateľ adresa mesto','žiadateľ adresa mesto','adresa mesto')
      const base  = (obec && OBEC[obec]) || OKRES[okres]
      if (!base) return
      // Menší jitter keď máme presnú obec, väčší keď len okres
      const jScale = (obec && OBEC[obec]) ? 0.008 : 0.06
      const jLat = (Math.sin(idx * 127.1 + 0.5) * 0.5) * jScale
      const jLng = (Math.sin(idx * 311.7 + 1.3) * 0.5) * jScale
      const stav  = g(p,'stav projektu','stav')
      const meta  = stavMeta(stav)
      const poo   = parseFloat(g(p,'poskytnuté poo €','poskytnuté poo','zazmluvnená suma zdroj poo','poo_suma')) || 0
      const pozad = parseFloat(g(p,'požadovaná suma','požadovaná suma bez dph')) || 0
      const suma  = poo || pozad
      const r     = suma > 0 ? Math.min(14, Math.max(5, 4 + Math.log10(suma/1000+1)*3)) : 5
      const isActive = normStav(stav) === 'PROJEKT_V_REALIZACII'
      const m = L.circleMarker([base[0]+jLat, base[1]+jLng], {
        radius: r,
        color: meta.c,
        weight: isActive ? 2.5 : 1.5,
        fillColor: meta.c,
        fillOpacity: 0.82,
        className: isActive ? 'pulse-marker' : '',
      })
      m.options.color = meta.c  // pre cluster dominant farbu
      m.bindPopup(makePopup(p, meta, meta.c), { maxWidth:340, className:'dark-popup' })
      markers.push(m)
    })
    mcg.addLayers(markers)
  }, [filtered, heatMode])

  // ── Heatmap vrstva ───────────────────────────────────────────────────────────
  useEffect(() => {
    const map = leafletRef.current
    if (!map) return
    if (layersRef.current.heat) {
      map.removeLayer(layersRef.current.heat)
      layersRef.current.heat = null
    }
    if (heatMode) {
      const layer = buildHeatLayer(filtered)
      layer.addTo(map)
      layersRef.current.heat = layer
    }
  }, [filtered, heatMode])

  // ── Štatistiky ────────────────────────────────────────────────────────────────
  // Hlavná POO suma: poskytnuté → zazmluvnená (bez požadovanej — tú zobrazujeme zvlášť)
  const totalPOO  = useMemo(()=>filtered.reduce((s,p)=>
    s+(parseFloat(g(p,'poskytnuté poo €','poskytnuté poo','zazmluvnená suma zdroj poo','poo_suma'))||0),0),[filtered])
  // Požadovaná suma — pre žiadateľov, ktorí nemajú POO sumu
  const totalPozadovana = useMemo(()=>filtered.reduce((s,p)=>
    s+(parseFloat(g(p,'požadovaná suma','požadovaná suma bez dph','pozadovana suma'))||0),0),[filtered])
  // Zazmluvnená (len projekty so zmluvou)
  const totalZazmluvnena = useMemo(()=>filtered.reduce((s,p)=>{
    const v = parseFloat(g(p,'zazmluvnená suma zdroj poo','zazmluvnena suma zdroj poo'))
    return s + (v > 0 ? v : 0)
  },0),[filtered])
  // Zúčtované POO
  const totalZuctovane = useMemo(()=>filtered.reduce((s,p)=>
    s+(parseFloat(g(p,'zúčtované poo €','zuctovane poo €','zuctovane poo'))||0),0),[filtered])
  const totalCelk = useMemo(()=>filtered.reduce((s,p)=>
    s+(parseFloat(g(p,'celková suma projektu','celkova suma projektu','celkova_suma'))||0),0),[filtered])

  const byKraj = useMemo(()=>{
    const m={}
    filtered.forEach(p=>{ const k=g(p,'kraj','Kraj')||'Neznámy kraj'; m[k]=(m[k]||0)+1 })
    return Object.entries(m).sort((a,b)=>b[1]-a[1])
  },[filtered])

  // Choropleth update
  useEffect(() => {
    const countMap = Object.fromEntries(byKraj)
    byKrajRef.current = countMap
    const layer = layersRef.current.kraje
    if (layer?.setStyle) {
      const max = byKraj[0]?.[1] || 1
      layer.setStyle(f => {
        const k = KRAJE.find(k => k.nuts === f.properties?.NUTS_ID)
        const cnt = countMap[k?.name] || 0
        return { fillOpacity: 0.06 + (cnt/max) * 0.38 }
      })
    }
  }, [byKraj])

  const byStav = useMemo(()=>{
    const m={}
    filtered.forEach(p=>{ const s=normStav(g(p,'stav projektu','stav'))||'NEZNAMY'; m[s]=(m[s]||0)+1 })
    return Object.entries(m).sort((a,b)=>b[1]-a[1])
  },[filtered])

  const byArea = useMemo(()=>{
    const m={}
    filtered.forEach(p=>{
      const kat = g(p,'kód investície / reformy','kod investicie','kod')
      if (!kat) return
      const km = kodMeta(kat)
      const key = km?.l || kat
      m[key] = { count:(m[key]?.count||0)+1, meta:km }
    })
    return Object.entries(m).sort((a,b)=>b[1].count-a[1].count)
  },[filtered])

  const byEntity = useMemo(()=>{
    const m={}
    filtered.forEach(p=>{
      const meno = g(p,'prijímateľ meno a priezvisko / názov',
        'žiadateľ meno a priezvisko / názov',
        'ziadatel meno a priezvisko / nazov','ziadatel')
      const pravnaForma = g(p,'prijímateľ právna forma','žiadateľ právna forma','pravna forma','právna forma')
      const ent = entityInfo(meno, pravnaForma)
      if (!m[ent.label]) m[ent.label]={ count:0, icon:ent.icon, cls:ent.cls, poo:0 }
      m[ent.label].count++
      m[ent.label].poo += parseFloat(g(p,'poskytnuté poo €','poskytnuté poo','zazmluvnená suma zdroj poo','poo_suma'))||0
    })
    return Object.entries(m).sort((a,b)=>b[1].count-a[1].count)
  },[filtered])

  const pooByKraj = useMemo(()=>{
    const m={}
    filtered.forEach(p=>{
      const k=g(p,'kraj','Kraj')||'Neznámy kraj'
      m[k]=(m[k]||0)+(parseFloat(g(p,'poskytnuté poo €','poskytnuté poo','zazmluvnená suma zdroj poo','poo_suma'))||0)
    })
    return m
  },[filtered])

  const krajList = useMemo(()=>[...new Set(data.map(p=>g(p,'kraj','Kraj')))].filter(Boolean).sort(),[data])
  const stavList = useMemo(()=>[...new Set(data.map(p=>normStav(g(p,'stav projektu','stav'))))].filter(Boolean).sort(),[data])
  // Pre filter kódov — zobraz len prefix (K01, K02...)
  const katList  = useMemo(()=>{
    const prefixes = new Set()
    data.forEach(p=>{
      const k = g(p,'kód investície / reformy','kod investicie','kod')
      if (!k) return
      const m = k.match(/^[KR]\d*/i)
      if (m) prefixes.add(m[0].toUpperCase())
    })
    return [...prefixes].sort()
  },[data])

  const maxKraj = byKraj[0]?.[1]||1

  return (
    <div className="app">

      {/* ── Easter egg overlay ──────────────────────────────────────── */}
      {eggVisible && (
        <div style={{position:'fixed',inset:0,pointerEvents:'none',zIndex:9999,overflow:'hidden'}}>
          <style>{`
            @keyframes eggFloat {
              0%   { transform: translateY(110vh) rotate(0deg) scale(0.5); opacity:0; }
              10%  { opacity:1; }
              50%  { transform: translateY(40vh) rotate(360deg) scale(1.3); }
              90%  { opacity:1; }
              100% { transform: translateY(-20vh) rotate(720deg) scale(0.8); opacity:0; }
            }
            @keyframes eggSpin {
              0%   { transform: translateX(-10vw) translateY(50vh) rotate(0deg) scale(1); opacity:0; }
              10%  { opacity:1; }
              50%  { transform: translateX(110vw) translateY(20vh) rotate(540deg) scale(1.5); }
              90%  { opacity:1; }
              100% { transform: translateX(120vw) translateY(70vh) rotate(900deg) scale(0.5); opacity:0; }
            }
          `}</style>
          {EGG_ICONS.map((icon, i) => (
            <div key={i} style={{
              position:'absolute',
              fontSize: `${2 + (i%3)}rem`,
              left: `${(i*17+7) % 90}%`,
              animation: i%2===0
                ? `eggFloat ${2+i*0.2}s ease-in-out forwards`
                : `eggSpin ${2.5+i*0.15}s ease-in-out forwards`,
              animationDelay: `${i*0.15}s`,
            }}>{icon}</div>
          ))}
          <div style={{
            position:'absolute', top:'50%', left:'50%',
            transform:'translate(-50%,-50%)',
            fontSize:'1.1rem', fontWeight:700, color:'#fff',
            textShadow:'0 0 20px #ef5350,0 2px 8px rgba(0,0,0,.8)',
            textAlign:'center', animation:'eggFloat 3s ease-in-out forwards',
          }}>🏥 Plán obnovy — zdravá SR! 🇸🇰</div>
        </div>
      )}

      {/* ── Header ──────────────────────────────────────────────────── */}
      <header className="hdr">
        <div className="hdr-brand" onClick={handleEggClick} style={{cursor:'pointer',userSelect:'none'}}>
          <span className="hdr-flag" title={eggClicks>0?`${5-eggClicks} kliknutí zostáva…`:''}>🇸🇰</span>
          <div>
            <div className="hdr-title">Plán obnovy SR</div>
            <div className="hdr-sub">Mapa projektov POO</div>
          </div>
        </div>

        <div className="hdr-filters">
          <select className="sel" value={filterKraj} onChange={e=>setFilterKraj(e.target.value)}>
            <option value="all">Všetky kraje</option>
            {krajList.map(k=><option key={k} value={k}>{k.replace(' kraj','')}</option>)}
          </select>

          <select className="sel" value={filterStav} onChange={e=>setFilterStav(e.target.value)}>
            <option value="all">Všetky stavy</option>
            {stavList.map(s=><option key={s} value={s}>{stavMeta(s).l}</option>)}
          </select>

          <select className="sel sel-wide" value={filterKat} onChange={e=>setFilterKat(e.target.value)}>
            <option value="all">Všetky kódy</option>
            {katList.map(k=>{
              const km = kodMeta(k)
              return <option key={k} value={k}>{k}{km?.l ? ' · '+km.l : ''}</option>
            })}
          </select>

          <div className="btn-group">
            <button className={`btn${showKraje?' btn-on':''}`} onClick={()=>setShowKraje(v=>!v)}>
              🗺 Kraje
            </button>
            <button className={`btn${heatMode?' btn-heat':''}`} onClick={()=>setHeatMode(v=>!v)}
              title="Zobraziť hustotu projektov per okres">
              🔥 Heatmap
            </button>
            <button
              className={`btn btn-tile${tileMode==='light'?' btn-on':''}`}
              onClick={()=>setTileMode(v=>v==='dark'?'light':'dark')}
              title="Prepnúť tmavú/svetlú mapu">
              {tileMode==='dark' ? '☀️ Svetlá' : '🌙 Tmavá'}
            </button>
          </div>
        </div>

        <div className="hdr-stats">
          {loading ? <span className="st-load">⏳ Načítavam…</span>
           : error  ? <span className="st-err">❌ {error}</span>
           : <>
              <div className="st">
                <div className="st-n">{filtered.length.toLocaleString('sk')}</div>
                <div className="st-l">projektov</div>
              </div>
              <div className="st-sep"/>
              {totalPOO > 0 ? <>
                <div className="st-sep"/>
                <div className="st">
                  <div className="st-n st-green">{fmt(totalPOO)}</div>
                  <div className="st-l">POO suma</div>
                </div>
              </> : totalPozadovana > 0 ? <>
                <div className="st-sep"/>
                <div className="st">
                  <div className="st-n st-orange">{fmt(totalPozadovana)}</div>
                  <div className="st-l">požadovaná suma</div>
                </div>
              </> : null}
              {totalZuctovane > 0 && <>
                <div className="st-sep"/>
                <div className="st">
                  <div className="st-n st-blue">{fmt(totalZuctovane)}</div>
                  <div className="st-l">zúčtované POO</div>
                </div>
              </>}
             </>}
        </div>
      </header>

      {/* ── Main ────────────────────────────────────────────────────── */}
      <div className="main">
        <div ref={mapRef} className="map" />

        <aside className="sidebar">

          {/* ── Súhrn financií ──────────────────────────────────── */}
          {!loading && filtered.length > 0 && (
            <div className="panel panel-finance">
              <div className="panel-title">Financovanie POO</div>
              <div className="fin-row">
                {totalZazmluvnena > 0 && (
                  <div className="fin-cell">
                    <div className="fin-val fin-val-zazml">{fmt(totalZazmluvnena)}</div>
                    <div className="fin-lbl">Zazmluvnené POO</div>
                  </div>
                )}
                {totalZuctovane > 0 && (
                  <div className="fin-cell">
                    <div className="fin-val fin-val-zuc">{fmt(totalZuctovane)}</div>
                    <div className="fin-lbl">Zúčtované POO</div>
                  </div>
                )}
                {totalCelk > 0 && (
                  <div className="fin-cell">
                    <div className="fin-val fin-val-dim">{fmt(totalCelk)}</div>
                    <div className="fin-lbl">Celková suma</div>
                  </div>
                )}
              </div>
              {totalZazmluvnena > 0 && totalCelk > 0 && (
                <div className="fin-bar-wrap">
                  <div className="fin-bar-track">
                    <div className="fin-bar-poo" style={{width:`${Math.min(100,(totalZazmluvnena/totalCelk)*100)}%`}}/>
                    {totalZuctovane > 0 && (
                      <div className="fin-bar-zuc" style={{width:`${Math.min(100,(totalZuctovane/totalCelk)*100)}%`}}/>
                    )}
                  </div>
                  <div className="fin-bar-leg">
                    <span className="fin-leg-poo">■ Zazml. {((totalZazmluvnena/totalCelk)*100).toFixed(0)}%</span>
                    {totalZuctovane > 0 && <span className="fin-leg-zuc">■ Zúč. {((totalZuctovane/totalCelk)*100).toFixed(0)}%</span>}
                    <span className="fin-leg-other">■ Iné zdroje</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Rola subjektu (Prijímateľ / Partner) ─────────── */}
          {!loading && (
            <div className="panel panel-postavenie">
              <div className="panel-title" style={{marginBottom:'6px'}}>Rola v projekte</div>
              <div className="pos-toggle">
                {[
                  { v:'all',        l:'Všetci' },
                  { v:'PRIJIMATEL', l:'✅ Príjemcovia' },
                  { v:'PARTNER',    l:'🤝 Partneri' },
                  { v:'ZIADATEL',   l:'📋 Žiadatelia' },
                ].map(({v,l})=>(
                  <button key={v}
                    className={`pos-btn${filterPostavenie===v?' pos-on':''}`}
                    onClick={()=>setFilterPostavenie(v)}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Projekty podľa kraja ────────────────────────────── */}
          <div className="panel">
            <div className="panel-title-row">
              <span className="panel-title" style={{marginBottom:0}}>Podľa kraja</span>
              <div className="view-toggle">
                <button className={`vt-btn${krajView==='count'?' vt-on':''}`}
                  onClick={()=>setKrajView('count')}>počet</button>
                <button className={`vt-btn${krajView==='suma'?' vt-on':''}`}
                  onClick={()=>setKrajView('suma')}>suma</button>
              </div>
            </div>
            {byKraj.map(([name,count])=>{
              const k = KRAJE.find(k=>name.includes(k.short)||name.includes(k.name.split(' ')[0]))
              const col = k?.color || '#7DAA6C'
              const active = filterKraj === name
              const poo = pooByKraj[name] || 0
              const maxVal = krajView==='suma'
                ? Math.max(...byKraj.map(([n])=>pooByKraj[n]||0), 1)
                : maxKraj
              const val = krajView==='suma' ? poo : count
              const pct = (val / maxVal) * 100
              const label = krajView==='suma' ? fmt(poo) : count.toLocaleString('sk')
              return (
                <div key={name} className={`bar-row${active?' bar-active':''}`}
                  onClick={()=>setFilterKraj(active?'all':name)}
                  style={{opacity:filterKraj!=='all'&&!active?.45:1}}>
                  <div className="bar-lbl">
                    <span>{name.replace(' kraj','')}</span>
                    <span className="bar-n" style={{color:col}}>{label}</span>
                  </div>
                  <div className="bar-track">
                    <div className="bar-fill" style={{background:col,width:`${pct}%`}}/>
                  </div>
                </div>
              )
            })}
          </div>

          {/* ── Typ subjektu ────────────────────────────────────── */}
          {byEntity.length > 0 && (
            <div className="panel">
              <div className="panel-title">Typ subjektu</div>
              {byEntity.map(([label,{count,icon,cls,poo}])=>{
                const maxE = byEntity[0]?.[1]?.count || 1
                const pct = (count/maxE)*100
                const active = filterEntity === label
                return (
                  <div key={label} className={`ent-row${active?' ent-active':''}`}
                    onClick={()=>setFilterEntity(active?'all':label)}
                    style={{opacity:filterEntity!=='all'&&!active?.45:1,cursor:'pointer'}}>
                    <div className="ent-head">
                      <span className="ent-icon">{icon}</span>
                      <span className={`ent-lbl ${cls}`}>{label}</span>
                      <span className="ent-n">{count.toLocaleString('sk')}</span>
                    </div>
                    <div className="bar-track">
                      <div className="bar-fill" style={{background:'var(--acc)',opacity:.7,width:`${pct}%`}}/>
                    </div>
                    {poo > 0 && (
                      <div className="ent-poo">{fmt(poo)}</div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* ── Stav projektov ──────────────────────────────────── */}
          <div className="panel">
            <div className="panel-title">Stav projektov</div>
            {byStav.map(([stav,count])=>{
              const meta = stavMeta(stav)
              const active = filterStav === stav
              const pct = (count/filtered.length)*100
              return (
                <div key={stav} className={`stav-row${active?' stav-active':''}`}
                  onClick={()=>setFilterStav(active?'all':stav)}
                  style={{opacity:filterStav!=='all'&&!active?.45:1}}>
                  <div className="stav-dot" style={{background:meta.c,boxShadow:`0 0 6px ${meta.c}bb`}}/>
                  <span className="stav-lbl">{meta.l}</span>
                  <span className="stav-pct" style={{color:meta.c+'cc'}}>{pct.toFixed(0)}%</span>
                  <span className="stav-n">{count.toLocaleString('sk')}</span>
                </div>
              )
            })}
          </div>

          {/* ── Oblasti plánu obnovy ────────────────────────────── */}
          {byArea.length > 0 && (
            <div className="panel">
              <div className="panel-title">Oblasti plánu obnovy</div>
              {byArea.map(([label,{count,meta}])=>{
                const col = meta?.c || '#546E7A'
                const maxA = byArea[0]?.[1]?.count || 1
                return (
                  <div key={label} className="area-row">
                    <div className="area-head">
                      <span className="area-icon">{meta?.icon||'📋'}</span>
                      <span className="area-lbl">{label}</span>
                      <span className="area-n" style={{color:col}}>{count.toLocaleString('sk')}</span>
                    </div>
                    <div className="bar-track">
                      <div className="bar-fill" style={{background:col,width:`${(count/maxA)*100}%`}}/>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

        </aside>
      </div>
    </div>
  )
}
