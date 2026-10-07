/* ===== Nimbus – script.js ===== */
const $ = (id) => document.getElementById(id);
let unit = "C";            // °C or °F
let cities = null;         // last live weather result

/* ---------- 1. Hero sky follows the visitor's real time of day ---------- */
function setSky() {
  const now = new Date();
  const h = now.getHours() + now.getMinutes() / 60;
  const skies = [  // [from hour, top colour, bottom colour, text colour, greeting]
    [0,    "#0b1030", "#2a3670", "#f4f1ff", "It's night where you are. Good time to look for stars."],
    [5,    "#f08a5d", "#ffd9a8", "#2a1a3a", "Dawn is breaking. Watch the light change the clouds."],
    [8,    "#4f9bff", "#dff1ff", "#14183a", "A daytime sky. Look up and name what you see."],
    [17,   "#ff8f5e", "#5b4a94", "#fff4ea", "Golden hour. Low sun lights the clouds from below."],
    [20.5, "#0b1030", "#2a3670", "#f4f1ff", "Night is here. Clear skies mean cooler mornings."],
  ];
  const s = [...skies].reverse().find((x) => h >= x[0]);
  const root = document.documentElement.style;
  root.setProperty("--sky1", s[1]); root.setProperty("--sky2", s[2]); root.setProperty("--hero-text", s[3]);
  $("heroLine").textContent = s[4];

  // Sun travels 6:00–18:00, moon the rest of the day
  const day = h >= 6 && h < 18;
  const t = day ? (h - 6) / 12 : (h >= 18 ? h - 18 : h + 6) / 12;
  const orb = $("orb");
  orb.className = "orb" + (day ? "" : " moon");
  orb.style.left = 8 + t * 84 + "%";
  orb.style.top = 62 - Math.sin(Math.PI * t) * 48 + "%";
}

/* ---------- 2. Live weather for eight cities (Open-Meteo, no key) ---------- */
const CITIES = [
  ["Reykjavík", 64.15, -21.94], ["Singapore", 1.35, 103.82], ["Cairo", 30.04, 31.24], ["Sydney", -33.87, 151.21],
  ["Lima", -12.05, -77.04], ["Mumbai", 19.08, 72.88], ["Vancouver", 49.28, -123.12], ["Nairobi", -1.29, 36.82],
];

// Weather code (WMO) -> [description, emoji]
function describe(code, isDay) {
  if (code === 0) return ["Clear sky", isDay ? "☀️" : "🌙"];
  if (code <= 2) return ["Partly cloudy", isDay ? "⛅" : "☁️"];
  if (code === 3) return ["Overcast", "☁️"];
  if (code <= 48) return ["Fog", "🌫️"];
  if (code <= 57) return ["Drizzle", "🌦️"];
  if (code <= 67) return ["Rain", "🌧️"];
  if (code <= 77) return ["Snow", "❄️"];
  if (code <= 82) return ["Rain showers", "🌦️"];
  if (code <= 86) return ["Snow showers", "🌨️"];
  return ["Thunderstorm", "⛈️"];
}
const temp = (c) => Math.round(unit === "C" ? c : c * 9 / 5 + 32) + "°";

async function loadCities() {
  $("board").innerHTML = '<p class="note">Loading the sky over eight cities…</p>';
  try {
    const url = "https://api.open-meteo.com/v1/forecast?current=temperature_2m,weather_code,is_day"
      + "&latitude=" + CITIES.map((c) => c[1]).join(",") + "&longitude=" + CITIES.map((c) => c[2]).join(",");
    const res = await fetch(url);
    if (!res.ok) throw new Error("bad status");
    const data = await res.json();
    if (!Array.isArray(data) || data.some((d) => !d.current)) throw new Error("incomplete");
    cities = data;
    renderCities();
  } catch {
    $("board").innerHTML = '<p>We couldn\'t load live weather. Check your connection and try again.</p><button id="retry" class="ghost retry">Try again</button>';
    $("retry").onclick = loadCities;
  }
}

function renderCities() {
  const temps = cities.map((d) => d.current.temperature_2m);
  const hot = temps.indexOf(Math.max(...temps)), cold = temps.indexOf(Math.min(...temps));
  $("board").innerHTML = cities.map((d, i) => {
    const [text, icon] = describe(d.current.weather_code, d.current.is_day === 1);
    const tag = i === hot ? '<span class="tag hot">Warmest</span>' : i === cold ? '<span class="tag cold">Coolest</span>' : "";
    return `<div class="row"><span class="city">${CITIES[i][0]}${tag}</span><span class="cond">${icon} ${text}</span><span class="temp">${temp(d.current.temperature_2m)}</span></div>`;
  }).join("");
}

$("unit").onclick = () => {
  unit = unit === "C" ? "F" : "C";
  $("unit").textContent = unit === "C" ? "Show °F" : "Show °C";
  if (cities) renderCities();
};

/* ---------- 3. Storm lab ---------- */
function lab() {
  const T = +$("sT").value, H = +$("sH").value, L = +$("sL").value;
  $("oT").textContent = T + " °C"; $("oH").textContent = H + " %"; $("oL").textContent = L + " %";

  // Instability score 0–100: warm, moist air with strong lift builds tall clouds
  const score = Math.round((T / 40) * 40 + (H / 100) * 35 + (L / 100) * 25);
  // Cloud base: air must rise about 125 m for every degree between temperature and dew point
  const dew = T - (100 - H) / 5;
  const base = Math.max(0, Math.round((T - dew) * 125 / 10) * 10);

  let name, text;
  if (score < 35)      [name, text] = ["Clear skies", "Too dry or too cool for much cloud. Expect sunshine."];
  else if (score < 55) [name, text] = ["Fair-weather cumulus", "Small puffy clouds form but can't grow much. A pleasant day."];
  else if (score < 70) [name, text] = ["Towering cumulus and showers", "Rising air is strong enough for tall clouds and a passing shower."];
  else if (score < 85) [name, text] = ["Thunderstorms", "Deep, powerful updrafts build a cumulonimbus with lightning and heavy rain."];
  else                 [name, text] = ["Severe storms", "Very warm, moist air with strong lift. Hail and damaging gusts are possible."];

  $("outcome").textContent = name;
  $("outText").textContent = text;
  $("base").textContent = H >= 98 ? "Cloud base: at the ground, which means fog." : `Estimated cloud base: about ${base.toLocaleString()} m above ground.`;
  const tower = $("tower");
  tower.style.height = Math.max(6, score * 2.1) + "px";
  tower.classList.toggle("storm", score >= 70);
  tower.parentElement.classList.toggle("dark", score >= 70);
}
["sT", "sH", "sL"].forEach((id) => $(id).addEventListener("input", lab));

/* ---------- Start ---------- */
setSky(); setInterval(setSky, 60000);
lab();
loadCities();
