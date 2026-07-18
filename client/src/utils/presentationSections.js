// import { normalizeSectionType } from '../constants/backgroundThemes'

// function isRepeaterSection(type) {
//   const value = (type || '').trim().toLowerCase()
//   return ['repeater', 'repeat', 'refrain', 'response', 'response line', 'tag'].includes(value)
// }

// function isChorusSection(type) {
//   const value = normalizeSectionType(type)
//   return value === 'chorus'
// }

// function isVerseSection(type) {
//   const value = normalizeSectionType(type)
//   return value.startsWith('verse')
// }

// export function getPresentationSections(sections = []) {
//   if (!Array.isArray(sections)) return []

//   const presentation = []
//   const repeatSections = []

//   for (const section of sections) {
//     if (isVerseSection(section?.type)) {
//       presentation.push({ ...section })
//       if (repeatSections.length > 0) {
//         for (const repeatSection of repeatSections) {
//           presentation.push({ ...repeatSection, __repeatInjected: true })
//         }
//       }
//       continue
//     }

//     if (isChorusSection(section?.type) || isRepeaterSection(section?.type)) {
//       presentation.push({ ...section })
//       repeatSections.push({ ...section })
//       continue
//     }

//     presentation.push({ ...section })
//   }

//   return presentation.filter((section) => !section.__repeatInjected || section.type)
// }

import { normalizeSectionType } from '../constants/backgroundThemes'

function isChorusSection(type) {
  return normalizeSectionType(type) === 'chorus'
}

function isVerseSection(type) {
  return normalizeSectionType(type).startsWith('verse')
}

function isBridgeSection(type) {
  return normalizeSectionType(type).startsWith('bridge')
}

export function getPresentationSections(sections = []) {
  if (!Array.isArray(sections)) return []

  const presentation = []
  let lastChorus = null

  for (let idx = 0; idx < sections.length; idx++) {
    const section = sections[idx]
    const nextSection = sections[idx + 1]

    if (isChorusSection(section?.type)) {
      presentation.push({ ...section })
      lastChorus = { ...section }
      continue
    }

    if (isVerseSection(section?.type)) {
      presentation.push({ ...section })

      // If a Bridge immediately follows this verse, let the Bridge
      // play first — the Chorus will be injected after the Bridge
      // instead (see below), not right here.
      const nextIsBridge = nextSection && isBridgeSection(nextSection.type)
      const nextIsExplicitChorus = nextSection && isChorusSection(nextSection.type)

      if (lastChorus && !nextIsBridge && !nextIsExplicitChorus) {
        presentation.push({ ...lastChorus, __repeatInjected: true })
      }
      continue
    }

    if (isBridgeSection(section?.type)) {
      presentation.push({ ...section })

      // Chorus always follows a Bridge, unless you've already typed
      // one explicitly right after it.
      const nextIsExplicitChorus = nextSection && isChorusSection(nextSection.type)

      if (lastChorus && !nextIsExplicitChorus) {
        presentation.push({ ...lastChorus, __repeatInjected: true })
      }
      continue
    }

    // Pre-Chorus, Intro, Outro, Repeater, Tag, custom types — untouched
    presentation.push({ ...section })
  }

  return presentation.filter((section) => !section.__repeatInjected || section.type)
}