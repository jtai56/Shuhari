export type UploadedProfile = {
  name: string;
  styleGoal: string;
  jewelryTone: "gold" | "silver" | "mixed";
  contrastLevel: "soft" | "balanced" | "high";
  makeupPreference: string;
};

export type PaletteColor = {
  name: string;
  hex: string;
  use: string;
  why?: string;
};

export type AnalysisResult = {
  source: "ai" | "fallback";
  confidence: "low" | "medium" | "high";
  archetype: string;
  season: string;
  undertone: string;
  overtone: string;
  value: string;
  chroma: string;
  contrast: string;
  summary: string;
  photoCaveats: ReadonlyArray<string>;
  whyItWorks: ReadonlyArray<string>;
  palette: ReadonlyArray<PaletteColor>;
  neutrals: ReadonlyArray<string>;
  accentColors: ReadonlyArray<string>;
  metals: ReadonlyArray<string>;
  avoid: ReadonlyArray<string>;
  makeup: {
    base: string;
    cheeks: string;
    lips: string;
    eyes: string;
  };
  hair: {
    best: ReadonlyArray<string>;
    avoid: ReadonlyArray<string>;
  };
  stylingGuide: ReadonlyArray<string>;
  shoppingChecklist: ReadonlyArray<string>;
  notice?: string;
};

const paletteLibrary = {
  softAutumn: {
    archetype: "Soft Earth Muse",
    season: "Soft Autumn",
    undertone: "warm-neutral",
    contrast: "low to medium",
    summary:
      "Your coloring reads calm, muted, and naturally warm. Earthy tones with softened depth make your features look refined rather than overpowered.",
    whyItWorks: [
      "Muted warmth mirrors natural skin warmth without turning yellow.",
      "Soft contrast keeps your face visible before the clothes.",
      "Powdered earthy shades add polish while still feeling understated.",
    ],
    palette: [
      { name: "Sesame Beige", hex: "#D3BEA3", use: "Base layers and knits" },
      { name: "Dry Sage", hex: "#9BA089", use: "Shirts and light outerwear" },
      { name: "Clay Rose", hex: "#B27D72", use: "Lip color and accent tops" },
      { name: "Mushroom Taupe", hex: "#8B796B", use: "Trousers and tailoring" },
      { name: "Olive Ink", hex: "#5D6049", use: "Structured coats and bags" },
    ],
    neutrals: ["oatmeal", "camel mist", "mushroom", "soft espresso"],
    accentColors: ["muted terracotta", "eucalyptus", "tea rose"],
    metals: ["brushed gold", "champagne metal", "warm tortoiseshell"],
    avoid: ["icy white", "neon coral", "true black", "electric jewel tones"],
    makeup: {
      base: "Sheer satin base in neutral-warm undertones.",
      cheeks: "Apricot beige or soft cinnamon blush.",
      lips: "Rosewood, dried fig, or maple nude.",
      eyes: "Taupe olive shadows with soft brown liner.",
    },
    stylingGuide: [
      "Choose tonal outfits with gentle contrast, like oatmeal with olive or clay with taupe.",
      "Favor washed fabrics, matte leather, brushed textures, and natural fibers.",
      "Keep prints sparse and low-contrast so the palette stays serene.",
    ],
    shoppingChecklist: [
      "Soft camel trench or collar jacket",
      "Muted olive cardigan",
      "Rose-brown lip tint",
      "Taupe trousers",
    ],
  },
  deepAutumn: {
    archetype: "Deep Cedar Edit",
    season: "Deep Autumn",
    undertone: "warm",
    contrast: "medium to high",
    summary:
      "You suit grounded depth with warmth. Rich browns, dark olive, and mineral reds bring clarity and sophistication without feeling harsh.",
    whyItWorks: [
      "Deep earthy shades echo natural contrast in hair, eyes, and brows.",
      "Warm pigments enhance skin richness instead of flattening it.",
      "Dense neutrals look luxurious and modern on you.",
    ],
    palette: [
      { name: "Roasted Chestnut", hex: "#6A4530", use: "Jackets and boots" },
      { name: "Forest Moss", hex: "#4F5B3E", use: "Sweaters and knits" },
      { name: "Brick Plum", hex: "#7A4B49", use: "Statement tops and lips" },
      { name: "Dark Rye", hex: "#A88962", use: "Soft balance pieces" },
      { name: "Ink Bronze", hex: "#37342D", use: "Tailoring and accessories" },
    ],
    neutrals: ["espresso", "dark olive", "bronzed brown", "warm charcoal"],
    accentColors: ["aubergine brown", "oxidized teal", "burnt paprika"],
    metals: ["antique gold", "bronze", "dark brass"],
    avoid: ["optic white", "cool pastel pink", "frosted lavender", "blue-black"],
    makeup: {
      base: "Velvet skin finish with warm-neutral depth.",
      cheeks: "Toasted apricot or cinnamon bronze.",
      lips: "Brick rose, mahogany nude, or chili brown.",
      eyes: "Olive bronze, bark brown, and softened espresso.",
    },
    stylingGuide: [
      "Anchor outfits with dark neutrals, then add one rich earthy accent.",
      "Use leather, suede, dense cotton, and crisp twill for quiet structure.",
      "Prefer curved silhouettes and strong collars over delicate details.",
    ],
    shoppingChecklist: [
      "Espresso coat",
      "Bronze-brown shoulder bag",
      "Dark olive knit",
      "Brick-toned lip product",
    ],
  },
  softSummer: {
    archetype: "Mist Linen Mood",
    season: "Soft Summer",
    undertone: "cool-neutral",
    contrast: "low",
    summary:
      "Your features shine in diffused coolness. Dusty rose, stone, and misted blue-gray feel elegant and effortless.",
    whyItWorks: [
      "Soft cool tones refine the skin without pulling too pink.",
      "Misty neutrals keep the overall impression airy and balanced.",
      "Low-contrast outfits create a polished, calm presence.",
    ],
    palette: [
      { name: "Stone Rose", hex: "#B49995", use: "Blouses and lip tones" },
      { name: "Misty Sage", hex: "#98A39B", use: "Shirting and dresses" },
      { name: "Pebble Taupe", hex: "#91857D", use: "Bottoms and knitwear" },
      { name: "Cloud Mauve", hex: "#8C7D8B", use: "Accessories and eyes" },
      { name: "River Slate", hex: "#687381", use: "Outerwear accents" },
    ],
    neutrals: ["soft stone", "mushroom gray", "cool taupe", "smoky navy"],
    accentColors: ["dusty berry", "sage gray", "muted denim"],
    metals: ["silver", "soft pewter", "white gold"],
    avoid: ["orange rust", "bright yellow", "stark black", "clear neon shades"],
    makeup: {
      base: "Natural skin tint with neutral-cool undertones.",
      cheeks: "Dusty rose or mauve nude.",
      lips: "Rose beige, plum nude, or cool tea pink.",
      eyes: "Taupe gray, smoked mauve, and brown-black liner.",
    },
    stylingGuide: [
      "Build monochrome looks in stone, mushroom, and rose-gray families.",
      "Choose washed textures, fluid tailoring, and matte finishes.",
      "Keep accessories delicate and slightly cool-toned.",
    ],
    shoppingChecklist: [
      "Cool taupe blazer",
      "Mauve-beige lip tint",
      "Stone knit set",
      "Silver-toned earrings",
    ],
  },
  deepWinter: {
    archetype: "Shadow Ink Line",
    season: "Deep Winter",
    undertone: "cool",
    contrast: "high",
    summary:
      "You carry strong contrast with a cooler cast. Deep ink, berry, and mineral neutrals create a sharp, editorial finish.",
    whyItWorks: [
      "High-contrast colors mirror and sharpen your natural definition.",
      "Cool depth keeps the complexion crisp instead of muddy.",
      "Focused jewel-earth shades feel clean, expensive, and modern.",
    ],
    palette: [
      { name: "Ink Pine", hex: "#243137", use: "Outerwear and tailoring" },
      { name: "Black Cherry", hex: "#5A2F3F", use: "Lips and statement layers" },
      { name: "Graphite Taupe", hex: "#6F6768", use: "Knitwear and suiting" },
      { name: "Mineral Ivory", hex: "#E7E0D8", use: "Crisp contrast basics" },
      { name: "Midnight Moss", hex: "#36433C", use: "Depth in casual wear" },
    ],
    neutrals: ["ink", "graphite", "cool espresso", "mineral ivory"],
    accentColors: ["berry wine", "forest teal", "cool pine"],
    metals: ["silver", "gunmetal", "platinum"],
    avoid: ["dusty beige", "yellow camel", "warm orange", "milky pastels"],
    makeup: {
      base: "Soft matte finish with precise spot coverage.",
      cheeks: "Cool rose-brown or muted berry.",
      lips: "Black cherry, mulberry nude, or rose plum.",
      eyes: "Charcoal taupe with precise liner definition.",
    },
    stylingGuide: [
      "Lean into clean silhouettes and purposeful contrast, like ink with mineral ivory.",
      "Use sleek textures, compact knits, and smooth leather rather than rustic finishes.",
      "Keep prints graphic, sparse, and high-definition.",
    ],
    shoppingChecklist: [
      "Ink coat or blazer",
      "Berry-plum lip tint",
      "Charcoal knit",
      "Gunmetal accessory",
    ],
  },
  balancedNeutral: {
    archetype: "Quiet Balance Studio",
    season: "Muted Neutral",
    undertone: "balanced neutral",
    contrast: "medium",
    summary:
      "You sit between warm and cool influences, so sophisticated muted neutrals look especially harmonious. Think curated, sculpted, and quietly luxurious.",
    whyItWorks: [
      "Balanced neutrals keep skin tone even and believable.",
      "Subtle contrast adds shape without overwhelming the face.",
      "Earth-led shades feel versatile and naturally premium.",
    ],
    palette: [
      { name: "Almond Milk", hex: "#DDD2C4", use: "Foundational tops" },
      { name: "Tea Brown", hex: "#8A7465", use: "Tailoring and bags" },
      { name: "Dried Rose", hex: "#A98280", use: "Beauty accents" },
      { name: "Lichen", hex: "#7B8575", use: "Knits and shirts" },
      { name: "Soft Bark", hex: "#5E5047", use: "Shoes and outerwear" },
    ],
    neutrals: ["almond", "greige", "tea brown", "soft bark"],
    accentColors: ["muted rose", "lichen green", "smoky cocoa"],
    metals: ["champagne gold", "soft silver", "mixed metal"],
    avoid: ["neon brights", "stark optic white", "fully saturated primaries"],
    makeup: {
      base: "Skin-first base with natural luminosity.",
      cheeks: "Rose beige or neutral apricot.",
      lips: "Tea rose, cinnamon nude, or mellow berry.",
      eyes: "Taupe cocoa with softly diffused liner.",
    },
    stylingGuide: [
      "Wear layered neutrals with one muted accent for a composed palette story.",
      "Favor clean seams, roomy silhouettes, and textured basics.",
      "Keep accessories architectural but understated.",
    ],
    shoppingChecklist: [
      "Greige overshirt",
      "Tea-brown trousers",
      "Neutral lip tint",
      "Mixed-metal everyday jewelry",
    ],
  },
} as const;

function choosePalette(profile: UploadedProfile) {
  if (profile.jewelryTone === "gold" && profile.contrastLevel === "soft") {
    return paletteLibrary.softAutumn;
  }

  if (profile.jewelryTone === "gold" && profile.contrastLevel === "high") {
    return paletteLibrary.deepAutumn;
  }

  if (profile.jewelryTone === "silver" && profile.contrastLevel === "soft") {
    return paletteLibrary.softSummer;
  }

  if (profile.jewelryTone === "silver" && profile.contrastLevel === "high") {
    return paletteLibrary.deepWinter;
  }

  if (profile.contrastLevel === "high") {
    return paletteLibrary.deepAutumn;
  }

  if (profile.contrastLevel === "soft") {
    return paletteLibrary.softAutumn;
  }

  return paletteLibrary.balancedNeutral;
}

function getFallbackDimensions(selected: ReturnType<typeof choosePalette>) {
  if (selected.season.includes("Soft")) {
    return {
      value: selected.season.includes("Autumn") ? "medium" : "light to medium",
      chroma: "muted / soft",
    };
  }

  if (selected.season.includes("Deep")) {
    return {
      value: "deep",
      chroma: "balanced to rich",
    };
  }

  return {
    value: "medium",
    chroma: "balanced-muted",
  };
}

function getFallbackHair(selected: ReturnType<typeof choosePalette>) {
  if (selected.undertone.includes("cool")) {
    return {
      best: ["soft ash brown", "cool dark brown", "smoky espresso"],
      avoid: ["orange brown", "copper", "golden bleach tones"],
    };
  }

  if (selected.undertone.includes("warm")) {
    return {
      best: ["tea brown", "chestnut brown", "soft espresso"],
      avoid: ["blue-black", "ashy gray brown", "icy blonde"],
    };
  }

  return {
    best: ["neutral brown", "mushroom brown", "soft dark chocolate"],
    avoid: ["extreme yellow gold", "flat blue-black", "highly saturated red"],
  };
}

export function buildFallbackAnalysis(
  profile: UploadedProfile,
  photoCount: number,
): AnalysisResult {
  const selected = choosePalette(profile);
  const dimensions = getFallbackDimensions(selected);
  const hair = getFallbackHair(selected);
  const personalizedGoal = profile.styleGoal.trim()
    ? ` For your goal of ${profile.styleGoal.trim().toLowerCase()}, this palette keeps the result intentional instead of trend-led.`
    : "";
  const personalizedMakeup = profile.makeupPreference.trim()
    ? ` Your current beauty preference of ${profile.makeupPreference.trim().toLowerCase()} fits best when kept within these softened earth-tone families.`
    : "";

  return {
    source: "fallback",
    confidence: "medium",
    ...selected,
    overtone: selected.undertone.includes("cool")
      ? "beige-pink or cool beige"
      : selected.undertone.includes("warm")
        ? "golden beige or warm beige"
        : "balanced beige",
    value: dimensions.value,
    chroma: dimensions.chroma,
    summary: `${selected.summary}${personalizedGoal}${personalizedMakeup}`,
    photoCaveats: [
      "Photo lighting, makeup, filters, and camera white balance can shift visible undertone.",
      "Use this as a strong starter read, then confirm colors in soft daylight near the face.",
    ],
    notice:
      photoCount > 0
        ? "AI-enhanced analysis will activate automatically when an `OPENAI_API_KEY` is configured. This demo version uses your style inputs plus upload count to generate a polished starter guide."
        : "Add a photo to receive a more personalized guide.",
    hair,
    stylingGuide: [
      ...selected.stylingGuide,
      `Use ${photoCount > 1 ? "your uploaded photos" : "your photo"} to compare these shades in daylight before buying basics.`,
    ],
    shoppingChecklist: profile.name.trim()
      ? [
          `${profile.name.trim()}'s signature ${selected.shoppingChecklist[0].toLowerCase()}`,
          ...selected.shoppingChecklist.slice(1),
        ]
      : [...selected.shoppingChecklist],
  };
}
