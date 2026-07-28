/**
 * Netlify Function: obtiene tráfico en tiempo real desde TomTom.
 * La API key nunca se envía al navegador.
 */

const CORRIDORS = [
  {
    id: "alameda-providencia",
    name: "Alameda · Providencia",
    category: "Avenida",
    points: [
      [-33.4567, -70.7046],
      [-33.4523, -70.6758],
      [-33.4454, -70.6505],
      [-33.4359, -70.6246],
      [-33.4274, -70.6080]
    ]
  },
  {
    id: "apoquindo",
    name: "Av. Apoquindo",
    category: "Avenida",
    points: [
      [-33.4251, -70.6074],
      [-33.4188, -70.5924],
      [-33.4118, -70.5748],
      [-33.4056, -70.5589]
    ]
  },
  {
    id: "costanera-norte",
    name: "Costanera Norte",
    category: "Autopista",
    points: [
      [-33.4238, -70.7365],
      [-33.4250, -70.6904],
      [-33.4196, -70.6455],
      [-33.4118, -70.6032],
      [-33.4036, -70.5682]
    ]
  },
  {
    id: "kennedy",
    name: "Av. Kennedy",
    category: "Autopista urbana",
    points: [
      [-33.4080, -70.6127],
      [-33.4050, -70.5914],
      [-33.4033, -70.5701],
      [-33.4026, -70.5468]
    ]
  },
  {
    id: "autopista-central",
    name: "Autopista Central · Ruta 5",
    category: "Autopista",
    points: [
      [-33.3719, -70.6615],
      [-33.4097, -70.6604],
      [-33.4528, -70.6620],
      [-33.4965, -70.6654],
      [-33.5352, -70.6720]
    ]
  },
  {
    id: "general-velasquez",
    name: "General Velásquez",
    category: "Autopista",
    points: [
      [-33.3978, -70.6920],
      [-33.4385, -70.6926],
      [-33.4786, -70.6942],
      [-33.5162, -70.6984]
    ]
  },
  {
    id: "vespucio-norte",
    name: "Vespucio Norte",
    category: "Autopista",
    points: [
      [-33.3864, -70.7331],
      [-33.3681, -70.6905],
      [-33.3647, -70.6423],
      [-33.3688, -70.6005],
      [-33.3800, -70.5660]
    ]
  },
  {
    id: "vespucio-sur",
    name: "Vespucio Sur",
    category: "Autopista",
    points: [
      [-33.5167, -70.7180],
      [-33.5160, -70.6780],
      [-33.5160, -70.6350],
      [-33.5150, -70.5980],
      [-33.5060, -70.5610]
    ]
  },
  {
    id: "ruta-68",
    name: "Ruta 68 · Acceso poniente",
    category: "Ruta interurbana",
    points: [
      [-33.4310, -70.7560],
      [-33.4360, -70.8040],
      [-33.4470, -70.8550],
      [-33.4680, -70.9070]
    ]
  },
  {
    id: "ruta-78",
    name: "Ruta 78 · Autopista del Sol",
    category: "Ruta interurbana",
    points: [
      [-33.4690, -70.7350],
      [-33.4870, -70.7900],
      [-33.5060, -70.8420],
      [-33.5270, -70.8950]
    ]
  },
  {
    id: "vicuna-mackenna",
    name: "Av. Vicuña Mackenna",
    category: "Avenida",
    points: [
      [-33.4490, -70.6310],
      [-33.4700, -70.6210],
      [-33.4930, -70.6090],
      [-33.5220, -70.5950]
    ]
  },
  {
    id: "santa-rosa",
    name: "Av. Santa Rosa",
    category: "Avenida",
    points: [
      [-33.4590, -70.6410],
      [-33.4870, -70.6400],
      [-33.5170, -70.6380],
      [-33.5480, -70.6350]
    ]
  },
  {
    id: "gran-avenida",
    name: "Gran Avenida",
    category: "Avenida",
    points: [
      [-33.4730, -70.6540],
      [-33.4970, -70.6570],
      [-33.5220, -70.6610],
      [-33.5480, -70.6660]
    ]
  },
  {
    id: "tobalaba",
    name: "Av. Tobalaba",
    category: "Avenida",
    points: [
      [-33.4210, -70.6010],
      [-33.4490, -70.5890],
      [-33.4770, -70.5790],
      [-33.5040, -70.5680]
    ]
  },
  {
    id: "irarrazaval",
    name: "Av. Irarrázaval",
    category: "Avenida",
    points: [
      [-33.4545, -70.6350],
      [-33.4550, -70.6110],
      [-33.4550, -70.5860],
      [-33.4550, -70.5610]
    ]
  }
];

function round(value, decimals = 0) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function congestionStatus(ratio, roadClosure = false) {
  if (roadClosure) return { level: "closed", label: "Cerrada", score: 4 };
  if (ratio < 0.30) return { level: "critical", label: "Congestión crítica", score: 4 };
  if (ratio < 0.50) return { level: "high", label: "Congestión alta", score: 3 };
  if (ratio < 0.75) return { level: "medium", label: "Congestión media", score: 2 };
  return { level: "normal", label: "Flujo normal", score: 1 };
}

function demoValue(corridor, index) {
  // Datos estables, pero con una pequeña variación horaria para visualizar el panel.
  const now = new Date();
  const seed = corridor.id.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const wave = Math.sin((now.getUTCHours() * 60 + now.getUTCMinutes() + seed + index * 17) / 31);
  const freeFlowSpeed = corridor.category.includes("Autopista") || corridor.category.includes("Ruta") ? 90 : 55;
  const ratio = Math.max(0.22, Math.min(0.96, 0.62 + wave * 0.25));
  const currentSpeed = Math.round(freeFlowSpeed * ratio);

  return {
    currentSpeed,
    freeFlowSpeed,
    currentTravelTime: Math.round(95 / ratio),
    freeFlowTravelTime: 95,
    confidence: 0.85,
    roadClosure: false,
    coordinates: null
  };
}

async function fetchPoint(apiKey, point) {
  const [lat, lng] = point;
  const url = new URL("https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/12/json");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("point", `${lat},${lng}`);
  url.searchParams.set("unit", "kmph");
  url.searchParams.set("thickness", "10");
  url.searchParams.set("openLr", "false");

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(8000)
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`TomTom ${response.status}: ${body.slice(0, 160)}`);
  }

  const payload = await response.json();
  const flow = payload.flowSegmentData;
  if (!flow) throw new Error("Respuesta de tráfico sin flowSegmentData");

  return {
    currentSpeed: Number(flow.currentSpeed),
    freeFlowSpeed: Number(flow.freeFlowSpeed),
    currentTravelTime: Number(flow.currentTravelTime),
    freeFlowTravelTime: Number(flow.freeFlowTravelTime),
    confidence: Number(flow.confidence ?? 0),
    roadClosure: Boolean(flow.roadClosure),
    coordinates: flow.coordinates?.coordinate ?? null
  };
}

function aggregateCorridor(corridor, samples) {
  const valid = samples.filter(Boolean);
  if (!valid.length) {
    return {
      ...corridor,
      available: false,
      status: { level: "unavailable", label: "Sin información", score: 0 }
    };
  }

  const average = key => valid.reduce((sum, item) => sum + item[key], 0) / valid.length;
  const currentSpeed = average("currentSpeed");
  const freeFlowSpeed = Math.max(1, average("freeFlowSpeed"));
  const currentTravelTime = average("currentTravelTime");
  const freeFlowTravelTime = average("freeFlowTravelTime");
  const confidence = average("confidence");
  const roadClosure = valid.some(item => item.roadClosure);
  const ratio = currentSpeed / freeFlowSpeed;
  const status = congestionStatus(ratio, roadClosure);

  const shape = valid.flatMap(item => {
    if (!Array.isArray(item.coordinates)) return [];
    return item.coordinates.map(point => [point.latitude, point.longitude]);
  });

  const delaySeconds = Math.max(0, currentTravelTime - freeFlowTravelTime);

  return {
    id: corridor.id,
    name: corridor.name,
    category: corridor.category,
    points: corridor.points,
    shape,
    available: true,
    currentSpeed: round(currentSpeed),
    freeFlowSpeed: round(freeFlowSpeed),
    speedRatio: round(ratio, 2),
    delayMinutes: round(delaySeconds / 60, 1),
    confidence: round(confidence, 2),
    roadClosure,
    status
  };
}

async function buildTrafficData(apiKey) {
  const live = Boolean(apiKey);

  const corridors = await Promise.all(
    CORRIDORS.map(async corridor => {
      const results = await Promise.allSettled(
        corridor.points.map((point, index) =>
          live ? fetchPoint(apiKey, point) : Promise.resolve(demoValue(corridor, index))
        )
      );

      const samples = results.map(result =>
        result.status === "fulfilled" ? result.value : null
      );

      return aggregateCorridor(corridor, samples);
    })
  );

  const available = corridors.filter(item => item.available);
  const averageRatio = available.length
    ? available.reduce((sum, item) => sum + item.speedRatio, 0) / available.length
    : 0;
  const overall = congestionStatus(averageRatio);

  return {
    mode: live ? "live" : "demo",
    provider: live ? "TomTom Traffic API" : "Datos demostrativos",
    updatedAt: new Date().toISOString(),
    refreshSeconds: 60,
    summary: {
      monitored: corridors.length,
      available: available.length,
      critical: available.filter(item => ["critical", "closed"].includes(item.status.level)).length,
      high: available.filter(item => item.status.level === "high").length,
      normal: available.filter(item => item.status.level === "normal").length,
      averageSpeed: available.length
        ? round(available.reduce((sum, item) => sum + item.currentSpeed, 0) / available.length)
        : 0,
      status: overall
    },
    corridors: corridors.sort((a, b) => (b.status.score ?? 0) - (a.status.score ?? 0))
  };
}

export default async request => {
  if (request.method !== "GET") {
    return Response.json(
      { error: "Método no permitido" },
      { status: 405, headers: { Allow: "GET" } }
    );
  }

  try {
    const data = await buildTrafficData(process.env.TOMTOM_API_KEY);

    return Response.json(data, {
      headers: {
        "Cache-Control": "public, max-age=15",
        "Netlify-CDN-Cache-Control": "public, s-maxage=55, stale-while-revalidate=300, durable",
        "Access-Control-Allow-Origin": "*"
      }
    });
  } catch (error) {
    console.error("traffic function error", error);
    return Response.json(
      {
        error: "No fue posible cargar el estado del tránsito.",
        detail: process.env.CONTEXT === "dev" ? String(error) : undefined
      },
      { status: 502 }
    );
  }
};

export const config = {
  path: "/api/traffic"
};
