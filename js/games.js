/**
 * GAME / MACHINE REGISTRY
 * -----------------------
 * This is the ONLY file you edit to add, remove or move an arcade machine.
 * The lobby builds itself from this array — collision, interaction zones,
 * seats, lighting and the info panel are all derived from these entries.
 *
 * {
 *   id            unique slug, also the deep link (index.html#star-swarm)
 *   title         marquee text — keep it short, it is drawn on a tiny screen
 *   year          shown on the marquee and in the info panel
 *   genre         one or two words
 *   description   one or two sentences for the info panel
 *   status        "playable" | "broken"
 *                 A "broken" machine is not a placeholder — it is a dead
 *                 cabinet with a dark tube and a paper note taped over it,
 *                 exactly like the two in every real neighbourhood arcade.
 *                 To bring a game online later: set status to "playable" and
 *                 fill in url. Nothing else in the codebase changes.
 *   url           where the cabinet takes the player (ignored when broken)
 *   defect        optional note text on the taped paper, default 고장 / 수리중
 *   cabinetTheme  key of CABINET_THEMES below
 *   machine       "cabinet" | "racing" | "table" | "whack"   (default "cabinet")
 *   x, y          position on the arcade floor, in world pixels.
 *                 OPTIONAL — omit both and the machine is auto-parked in the
 *                 overflow row along the south aisle, so a new game can be
 *                 added without touching the layout at all.
 * }
 *
 * Room is 960 x 760 world px. Walkable interior is roughly x 24..936, y 64..700.
 */
export const GAMES = [
  {
    id: 'sky-raid',
    title: 'SKY RAID',
    year: 1983,
    genre: 'VERTICAL SHOOTER',
    description: '끝없이 밀려오는 편대 사이로 기수를 꺾는다. 방아쇠는 놓지 말고, 연료계는 보지 말 것.',
    status: 'playable',
    url: 'https://sky-raid-1983.vercel.app',
    cabinetTheme: 'crimson',
    machine: 'cabinet',
    x: 118, y: 116
  },
  {
    id: 'star-swarm',
    title: 'STAR SWARM',
    year: 1981,
    genre: 'FIXED SHOOTER',
    description: '대열을 지어 내려오다 갑자기 흩어져 꽂힌다. 포대 하나, 화면 하나, 두 번째 기회는 없다.',
    status: 'playable',
    url: 'https://nam2037772.github.io/star-swarm-1981/',
    cabinetTheme: 'cyan',
    machine: 'cabinet',
    x: 182, y: 116
  },
  {
    id: 'last-bus-panic',
    title: 'LAST BUS PANIC',
    year: 1984,
    genre: 'ACTION PUZZLE',
    description: '막차는 자정에 끊기는데 온 동네가 그 버스를 탄다. 문이 닫히기 전에 줄을 정리하라.',
    status: 'playable',
    url: 'https://last-bus-panic-1984.vercel.app',
    cabinetTheme: 'amber',
    machine: 'cabinet',
    x: 246, y: 116
  },
  {
    id: 'steel-climber',
    title: 'STEEL CLIMBER',
    year: 1981,
    genre: 'PLATFORM CLIMB',
    description: '철골과 사다리, 그리고 떨어지는 리벳. 크레인이 돌아오기 전에 꼭대기까지 올라간다.',
    status: 'playable',
    url: 'https://nam2037772.github.io/steel-climber-1981/',
    cabinetTheme: 'orange',
    machine: 'cabinet',
    x: 310, y: 116
  },
  {
    id: 'kim-manager',
    title: 'KIM MANAGER',
    year: 1983,
    genre: 'OFFICE ACTION',
    description: '아침 아홉 시, 터진 일은 마흔 가지, 사람은 김 과장 하나. 퇴근 종이 울릴 때까지 현장을 굴려라.',
    status: 'playable',
    url: 'https://kim-manager-1983.vercel.app/',
    cabinetTheme: 'lime',
    machine: 'cabinet',
    x: 222, y: 372
  },
  {
    id: 'tank-zone',
    title: 'TANK ZONE',
    year: 1983,
    genre: 'COMBAT',
    description: '와이어프레임 능선, 장전된 포탄 한 발, 그리고 저 능선 위에서 움직이는 무언가.',
    status: 'broken',
    url: '',
    cabinetTheme: 'olive',
    machine: 'cabinet',
    x: 686, y: 116
  },
  {
    id: 'galaxy-defender',
    title: 'GALAXY DEFENDER',
    year: 1981,
    genre: 'SCROLLING SHOOTER',
    description: '지표를 순찰하고 이주민을 구하되 스캐너에서 눈을 떼지 말 것. 변종은 이미 등 뒤에 있다.',
    status: 'broken',
    url: '',
    cabinetTheme: 'violet',
    machine: 'cabinet',
    x: 286, y: 372
  },
  {
    id: 'moon-lander',
    title: 'MOON LANDER',
    year: 1980,
    genre: 'VECTOR SIM',
    description: '벡터 지형에 진짜 중력, 연료는 마지막 한 방울까지 계산된다. 초속 2미터 이하로 착륙할 것.',
    status: 'broken',
    url: '',
    cabinetTheme: 'silver',
    machine: 'cabinet',
    x: 350, y: 372
  },
  {
    id: 'neon-racer',
    title: 'NEON RACER',
    year: 1985,
    genre: 'RACING',
    description: '노을 진 고속도로와 밀려드는 차들. 체크포인트를 통과해야만 시간이 늘어난다.',
    status: 'broken',
    url: '',
    cabinetTheme: 'magenta',
    machine: 'racing',
    x: 800, y: 356
  },
  {
    id: 'dungeon-84',
    title: 'DUNGEON 84',
    year: 1984,
    genre: 'MAZE RPG',
    description: '횃불과 타일 미로, 그리고 열쇠를 삼키는 무언가. 지도는 모눈종이에 직접 그려야 한다.',
    status: 'broken',
    url: '',
    cabinetTheme: 'teal',
    machine: 'table',
    x: 168, y: 546
  },
  {
    id: 'bomb-city',
    title: 'BOMB CITY',
    year: 1982,
    genre: 'REFLEX',
    description: '도시 여섯, 포대 셋, 하늘 가득한 낙하물. 궤적이 겹치는 지점을 노려라.',
    status: 'broken',
    url: '',
    cabinetTheme: 'blue',
    machine: 'whack',
    x: 430, y: 556
  }
];

/**
 * CABINET THEMES — side art, marquee neon, CRT tint.
 * Add a key here and reference it from cabinetTheme.
 */
export const CABINET_THEMES = {
  crimson: { body: '#3a1220', trim: '#7a1f35', neon: '#ff3b5c', screen: '#2a0713' },
  cyan:    { body: '#0d2a33', trim: '#166a7d', neon: '#3ef0ff', screen: '#04181f' },
  amber:   { body: '#3a2708', trim: '#8a5c12', neon: '#ffb63b', screen: '#251704' },
  orange:  { body: '#361707', trim: '#8a3d12', neon: '#ff7a2f', screen: '#210d03' },
  lime:    { body: '#16300f', trim: '#3f7a1f', neon: '#8dff4a', screen: '#0a1c06' },
  violet:  { body: '#25123a', trim: '#5b2b8a', neon: '#b06bff', screen: '#160722' },
  magenta: { body: '#360f2c', trim: '#8a2070', neon: '#ff4fd0', screen: '#20061a' },
  teal:    { body: '#0c2e2a', trim: '#177a6c', neon: '#33ffd0', screen: '#041c19' },
  blue:    { body: '#131e42', trim: '#2b46a0', neon: '#5b8cff', screen: '#08102a' },
  silver:  { body: '#22242b', trim: '#585d6b', neon: '#c8d4e8', screen: '#101218' },
  olive:   { body: '#2f3018', trim: '#6b6a2a', neon: '#d8d055', screen: '#191a08' }
};

/**
 * MACHINE SHAPES — footprint on the floor + how tall the thing is drawn,
 * and where the player stands or sits when they use it.
 * `seat` is the offset from the machine centre to the seat / standing spot.
 */
export const MACHINE_SHAPES = {
  //                                          seat = where the player ends up
  //                                          crtY = camera target when we zoom in
  cabinet: { w: 46, d: 22, h: 52, seat: { x: 0, y: 26 }, sits: true,  crtY: -39 },
  racing:  { w: 62, d: 58, h: 44, seat: { x: 0, y: 16 }, sits: true,  crtY: -51 },
  table:   { w: 56, d: 40, h: 18, seat: { x: 0, y: 34 }, sits: true,  crtY: -10 },
  whack:   { w: 50, d: 38, h: 30, seat: { x: 0, y: 30 }, sits: false, crtY: -19 }
};

export function themeOf(game) {
  return CABINET_THEMES[game.cabinetTheme] || CABINET_THEMES.silver;
}

export function shapeOf(game) {
  return MACHINE_SHAPES[game.machine] || MACHINE_SHAPES.cabinet;
}
