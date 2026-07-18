export const BACKGROUND_THEMES = [
  {
    key: "dark",
    name: "Dark",
    color: "#0f0c29",
    gradient: "linear-gradient(-45deg, #0f0c29, #302b63, #24243e, #0f0c29)",
  },
  {
    key: "blue",
    name: "Blue",
    color: "#16213e",
    gradient: "linear-gradient(-45deg, #0a0a0a, #1a1a2e, #16213e, #0f3460)",
  },
  {
    key: "warm",
    name: "Warm",
    color: "#6b2f2f",
    gradient: "linear-gradient(-45deg, #2c0f0f, #4a1c1c, #6b2f2f, #2c0f0f)",
  },
  {
    key: "sunset",
    name: "Sunset",
    color: "#fd1d1d",
    gradient: "linear-gradient(90deg, rgba(131,58,180,1) 0%, rgba(253,29,29,1) 50%, rgba(252,176,69,1) 100%)",
  },
  {
    key: "ocean",
    name: "Ocean",
    color: "#2a5298",
    gradient: "linear-gradient(-45deg, #1e3c72, #2a5298, #1e3c72, #2a5298)",
  },
  {
    key: "forest",
    name: "Forest",
    color: "#004d2c",
    gradient: "linear-gradient(-45deg, #002200, #004d2c, #003311, #002200)",
  },
  {
    key: "velvet",
    name: "Velvet",
    color: "#4d0000",
    gradient: "linear-gradient(-45deg, #1a0000, #4d0000, #330000, #1a0000)",
  },
  {
    key: "abyss",
    name: "Abyss",
    color: "#083d77",
    gradient: "linear-gradient(-45deg, #001524, #083d77, #001524, #14213d)",
  },
  {
    key: "violet",
    name: "Violet",
    color: "#240b36",
    gradient: "linear-gradient(-45deg, #13012c, #240b36, #120d31, #000000)",
  },
  {
    key: "chocolate",
    name: "Chocolate",
    color: "#2e2212",
    gradient: "linear-gradient(-45deg, #100c08, #2e2212, #1b140d, #100c08)",
  },
];

export const DEFAULT_THEME_KEY = "violet";

export function getThemeOption(themeKey) {
  return BACKGROUND_THEMES.find((theme) => theme.key === themeKey) || BACKGROUND_THEMES.find((theme) => theme.key === DEFAULT_THEME_KEY);
}

export function getThemeGradient(themeKey) {
  return getThemeOption(themeKey)?.gradient || getThemeOption(DEFAULT_THEME_KEY).gradient;
}

export function getThemeLabel(themeKey) {
  return getThemeOption(themeKey)?.name || themeKey;
}

export function normalizeSectionType(type) {
  if (!type) return "default";
  return type.toLowerCase().split(" ")[0];
}

export function getThemeForSection(bgMappings, songId, sectionIndex, sectionType) {
  const sectionIdentity = `${songId ?? "song"}:${sectionIndex ?? 0}`;
  const normalizedType = normalizeSectionType(sectionType);

  return (
    bgMappings?.[sectionIdentity] ||
    bgMappings?.[normalizedType] ||
    bgMappings?.[sectionType] ||
    bgMappings?.default ||
    DEFAULT_THEME_KEY
  );
}

export function setThemeForSection(bgMappings, songId, sectionIndex, sectionType, themeKey) {
  const sectionIdentity = `${songId ?? "song"}:${sectionIndex ?? 0}`;
  const normalizedType = normalizeSectionType(sectionType);

  return {
    ...bgMappings,
    [sectionIdentity]: themeKey,
    [normalizedType]: bgMappings?.[normalizedType] || bgMappings?.[sectionType] || bgMappings?.default,
  };
}
