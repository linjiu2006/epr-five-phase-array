// Five Phase color modes. `energy` values are HDR linear colors used by the
// additive laser / energy materials; `ui` is the sRGB accent used by the HUD.
export const ARMOR_PROFILES = [
  {
    id: 'long',
    code: '01',
    name: '龙',
    en: 'DRAGON PHASE',
    ui: '#ff465b',
    ink: '#ffb0b9',
    screenIndex: 0,
    energy: {
      core: [4.8, 0.14, 0.24],
      mid: [3.55, 0.045, 0.10],
      deep: [1.7, 0.005, 0.025],
      soft: [5.6, 0.78, 0.82],
    },
  },
  {
    id: 'ying',
    code: '02',
    name: '鹰',
    en: 'EAGLE PHASE',
    ui: '#3d9eff',
    ink: '#a8d7ff',
    screenIndex: 4,
    energy: {
      core: [0.16, 1.35, 5.2],
      mid: [0.04, 0.68, 3.55],
      deep: [0.005, 0.14, 1.45],
      soft: [0.30, 2.2, 5.6],
    },
  },
  {
    id: 'xi',
    code: '03',
    name: '犀',
    en: 'RHINO PHASE',
    ui: '#39df86',
    ink: '#a3ffca',
    screenIndex: 3,
    energy: {
      core: [0.32, 4.7, 1.25],
      mid: [0.10, 3.15, 0.72],
      deep: [0.015, 1.15, 0.25],
      soft: [0.82, 5.1, 1.95],
    },
  },
  {
    id: 'hu',
    code: '04',
    name: '虎',
    en: 'TIGER PHASE',
    ui: '#ffae32',
    ink: '#ffdca1',
    screenIndex: 1,
    energy: {
      core: [5.4, 2.05, 0.16],
      mid: [4.05, 1.18, 0.045],
      deep: [1.8, 0.32, 0.008],
      soft: [5.9, 3.9, 0.82],
    },
  },
  {
    id: 'he',
    code: '05',
    name: '鹤',
    en: 'CRANE PHASE',
    ui: '#e9f3f7',
    ink: '#ffffff',
    screenIndex: 2,
    energy: {
      core: [3.25, 3.4, 3.65],
      mid: [2.42, 2.56, 2.82],
      deep: [0.92, 1.0, 1.16],
      soft: [4.5, 4.65, 4.95],
    },
  },
]

export const ARMOR_PROFILE_MAP = new Map(ARMOR_PROFILES.map((profile) => [profile.id, profile]))

export function getArmorProfile(id) {
  return ARMOR_PROFILE_MAP.get(id) || ARMOR_PROFILES[0]
}
