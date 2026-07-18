import { useSocket } from "../context/SocketContext";
import { useSongs } from "../hooks/useSongs";
import { useEffect, useState } from "react";
import {
  DEFAULT_THEME_KEY,
  getThemeForSection,
  getThemeGradient,
  normalizeSectionType,
} from "../constants/backgroundThemes";
import { getPresentationSections } from "../utils/presentationSections";

export default function Display() {
  const { presenterState, socket } = useSocket();
  const { songs, fetchSongs } = useSongs();
  const [prevScheme, setPrevScheme] = useState("");
  const [prevSectionIdentity, setPrevSectionIdentity] = useState("");
  const [bgTransition, setBgTransition] = useState(0);

  const { songId, sectionIndex, lang, blank } = presenterState;

  useEffect(() => {
    const s = socket?.current
    if (!s) return

    const handleSongsUpdated = () => {
      fetchSongs()
    }

    s.on('songs:updated', handleSongsUpdated)
    return () => s.off('songs:updated', handleSongsUpdated)
  }, [socket, fetchSongs])

  const song = songs.find((s) => s.id === songId);
  const presentationSections = getPresentationSections(song?.sections || []);
  const section = presentationSections?.[sectionIndex];

  const getSectionLyrics = (currentSection, currentLang) => {
    if (!currentSection) return "";

    if (currentLang === "te") {
      return currentSection.lyrics_te?.trim() || currentSection.lyrics_en?.trim() || "";
    }

    if (currentLang === "both") {
      return currentSection.lyrics_en?.trim() || currentSection.lyrics_te?.trim() || "";
    }

    return currentSection.lyrics_en?.trim() || currentSection.lyrics_te?.trim() || "";
  };

  const lyrics = getSectionLyrics(section, lang);
  const lyricLines = lyrics ? lyrics.split("\n").filter((line) => line.trim()) : [];
  const isLongLyricBlock = lyricLines.length > 3 || lyrics?.length > 220;
  const lyricFontSize = isLongLyricBlock
    ? "clamp(20px, 3.2vw, 42px)"
    : "clamp(24px, 5vw, 60px)";
  const lyricLineHeight = isLongLyricBlock ? 1.2 : 1.4;

  const sectionType = normalizeSectionType(section?.type);
  const sectionIdentity = `${songId ?? "none"}-${sectionIndex ?? 0}-${sectionType ?? "default"}`;

  const getSectionVisual = (type) => {
    const normalized = String(type || '').trim().toLowerCase();
    if (normalized === 'chorus' || normalized === 'repeater') {
      return {
        badge: 'Chorus',
        color: '#fff',
        accent: 'rgba(255,255,255,0.18)',
        glow: 'rgba(124,106,247,0.28)',
      };
    }
    if (normalized.startsWith('bridge')) {
      return {
        badge: 'Bridge',
        color: '#ffe0b2',
        accent: 'rgba(226,162,75,0.18)',
        glow: 'rgba(226,162,75,0.24)',
      };
    }
    if (normalized === 'pre-chorus') {
      return {
        badge: 'Pre-Chorus',
        color: '#d7f8f4',
        accent: 'rgba(89,182,176,0.16)',
        glow: 'rgba(89,182,176,0.22)',
      };
    }
    if (normalized.startsWith('verse')) {
      return {
        badge: 'Verse',
        color: '#dbe9ff',
        accent: 'rgba(124,178,255,0.16)',
        glow: 'rgba(124,178,255,0.22)',
      };
    }
    if (normalized === 'outro') {
      return {
        badge: 'Outro',
        color: '#f5dfff',
        accent: 'rgba(199,134,255,0.16)',
        glow: 'rgba(199,134,255,0.22)',
      };
    }
    return {
      badge: 'Section',
      color: '#f2f2f2',
      accent: 'rgba(255,255,255,0.1)',
      glow: 'rgba(255,255,255,0.14)',
    };
  };

  const sectionVisual = getSectionVisual(section?.type);

  const activeThemeKey = getThemeForSection(
    presenterState.bgMappings,
    songId,
    sectionIndex,
    section?.type
  );

  const activeScheme = getThemeGradient(activeThemeKey || DEFAULT_THEME_KEY);

// Smooth transition on section change or scheme change
useEffect(() => {
  if (activeScheme !== prevScheme || sectionIdentity !== prevSectionIdentity) {
    setBgTransition(0);
    const timer = setTimeout(() => setBgTransition(1), 50);
    return () => clearTimeout(timer);
  }
}, [activeScheme, prevScheme, sectionIdentity, prevSectionIdentity]);

// Update the remembered scheme and section after transition completes
useEffect(() => {
  if (bgTransition === 1) {
    const timer = setTimeout(() => {
      setPrevScheme(activeScheme);
      setPrevSectionIdentity(sectionIdentity);
    }, 3500);
    return () => clearTimeout(timer);
  }
}, [bgTransition, activeScheme, sectionIdentity]);


  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      {/* Background image layer */}
      {song?.image && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundImage: `url(${song.image})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundAttachment: "fixed",
            zIndex: 0,
            opacity: 0.3,
          }}
        />
      )}

      {/* Base background layer (old color) */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "120%",
          height: "120%",
          backgroundImage: prevScheme || activeScheme,
          backgroundSize: "200% 200%",
          animation: "gradientShift 8s ease infinite",
          zIndex: 0,
        }}
      />

      {/* Foreground layer with smooth opacity transition (new color) */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "120%",
          height: "120%",
          backgroundImage: activeScheme,
          backgroundSize: "200% 200%",
          animation: "gradientShift 8s ease infinite",
          opacity: bgTransition,
          transition: "opacity 3.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
          zIndex: 0,
        }}
      />

      {/* Animated moving lines overlay */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          zIndex: 0,
          overflow: "hidden",
        }}
      >
        {/* Animated wave pulses */}
        {[...Array(3)].map((_, i) => (
          <div
            key={`wave-${i}`}
            style={{
              position: "absolute",
              width: "200%",
              height: "100%",
              top: 0,
              left: 0,
              background: `radial-gradient(ellipse at 50% ${50 + i * 20}%, rgba(255,255,255,0.02) 0%, transparent 70%)`,
              animation: `waves ${12 + i * 4}s ease-in-out infinite`,
              animationDelay: `${i * 1}s`,
            }}
          />
        ))}

        {/* Floating particles */}
        {[...Array(15)].map((_, i) => (
          <div
            key={`particle-${i}`}
            style={{
              position: "absolute",
              width: "3px",
              height: "3px",
              background: "rgba(255, 255, 255, 0.4)",
              borderRadius: "50%",
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `float ${10 + Math.random() * 10}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 5}s`,
            }}
          />
        ))}
      </div>

      {/* Content layer */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: "100vw",
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: isLongLyricBlock ? "flex-start" : "center",
          padding: isLongLyricBlock ? "80px 60px 110px" : "40px 60px",
          overflow: "auto",
          overflowX: "hidden",
          overflowY: "auto",
        }}
      >
      <div style={{ textAlign: "center", maxWidth: "100%", width: "100%", minHeight: "fit-content" }}>
        {blank || !section ? null : (
          <>
            {/* Section label */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                padding: "8px 14px",
                borderRadius: "999px",
                marginBottom: "24px",
                background: sectionVisual.accent,
                boxShadow: `0 0 0 1px ${sectionVisual.glow} inset, 0 12px 30px ${sectionVisual.glow}`,
                backdropFilter: "blur(8px)",
              }}
            >
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "999px",
                  background: sectionVisual.color,
                  boxShadow: `0 0 10px ${sectionVisual.glow}`,
                }}
              />
              <p
                style={{
                  fontSize: "13px",
                  color: sectionVisual.color,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  fontWeight: 600,
                  margin: 0,
                }}
              >
                {section.type === 'Pre-Chorus' ? 'Pre-Chorus' : section.type === 'Bridge 1' ? 'Bridge 1' : section.type === 'Bridge 2' ? 'Bridge 2' : section.type || 'Section'}
              </p>
            </div>

            {/* Main lyrics with line-by-line reveal */}
            <div
              key={`lyrics-${songId}-${sectionIndex}`}
              style={{
                fontSize: lyricFontSize,
                color: "#ffffff",
                lineHeight: lyricLineHeight,
                fontWeight: 400,
                fontFamily: lang === "te" ? "'Gidugu', sans-serif" : "'Georgia', serif",
                whiteSpace: "pre-wrap",
                letterSpacing: "0.02em",
                wordWrap: "break-word",
                overflowWrap: "break-word",
                paddingTop: isLongLyricBlock ? "8px" : "0px",
                paddingBottom: isLongLyricBlock ? "8px" : "0px",
                textAlign: "center",
              }}
            >
              {lyricLines.map((line, index) => (
                <div
                  key={`${songId}-${sectionIndex}-${index}`}
                  style={{
                    opacity: 1,
                    transform: "translateY(0)",
                    filter: "blur(0)",
                    marginBottom: index < lyricLines.length - 1 ? "0.35em" : 0,
                  }}
                >
                  {line}
                </div>
              ))}
            </div>

            {/* Translation */}
            {lang === "both" && section.lyrics_te && (
              <p
                style={{
                  fontSize: "clamp(16px, 2.5vw, 35px)",
                  color: "#777",
                  lineHeight: 1.3,
                  fontWeight: 300,
                  whiteSpace: "pre-line",
                  marginTop: "28px",
                  fontStyle: "italic",
                }}
              >
                {section.lyrics_te}
              </p>
              
            )}

            {/* Song title footer */}
            <p
              style={{
                marginTop: "48px",
                fontSize: "13px",
                color: "#333",
                letterSpacing: "0.04em",
              }}
            >
              {song?.title}
              {song?.key ? ` · ${song.key}` : ""}
            </p>
          </>
        )}
      </div>
      </div>
      {/* Background animation styles */}
      <style>
        {`
          @keyframes waves {
            0% {
              transform: translateX(0) scaleY(1);
              opacity: 0.1;
            }
            50% {
              transform: translateX(20px) scaleY(1.2);
              opacity: 0.05;
            }
            100% {
              transform: translateX(40px) scaleY(1);
              opacity: 0.1;
            }
          }

          @keyframes float {
            0%, 100% {
              transform: translateY(0px) translateX(0px);
              opacity: 0.3;
            }
            25% {
              transform: translateY(-30px) translateX(15px);
              opacity: 0.6;
            }
            50% {
              transform: translateY(-60px) translateX(-20px);
              opacity: 0.3;
            }
            75% {
              transform: translateY(-30px) translateX(10px);
              opacity: 0.5;
            }
          }

          @keyframes gradientShift {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
        `}
      </style>
    </div>
  );
}