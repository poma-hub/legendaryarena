export interface Arena {
  name: string
  slug: string
  gid: string
  pokemonId: number
  color: string
}

const arenaIcons = import.meta.glob<string>('../assets/la_icons/*.png', {
  eager: true,
  import: 'default',
  query: '?url',
})

export function getArenaIcon(arena: Arena): string {
  const iconPath = `../assets/la_icons/${arena.slug.replace(/-/g, '_')}.png`
  const icon = arenaIcons[iconPath]
  if (!icon) throw new Error(`Missing arena icon: ${iconPath}`)
  return icon
}

export const arenas: Arena[] = [
  { name: 'Azelf', slug: 'azelf', gid: '264507450', pokemonId: 482, color: '#bc8cff' },
  { name: 'Cobalion', slug: 'cobalion', gid: '1922313200', pokemonId: 638, color: '#a6c5cc' },
  { name: 'Cresselia', slug: 'cresselia', gid: '457679049', pokemonId: 488, color: '#e4a4c9' },
  { name: 'Entei', slug: 'entei', gid: '1068670487', pokemonId: 244, color: '#ff9472' },
  { name: 'Latias', slug: 'latias', gid: '1691684799', pokemonId: 380, color: '#fb809d' },
  { name: 'Latios', slug: 'latios', gid: '0', pokemonId: 381, color: '#83adff' },
  { name: 'Moltres', slug: 'moltres', gid: '1380605510', pokemonId: 146, color: '#ffb469' },
  { name: 'Raikou', slug: 'raikou', gid: '509690471', pokemonId: 243, color: '#f1c86b' },
  { name: 'Regirock', slug: 'regirock', gid: '179961838', pokemonId: 377, color: '#d9a779' },
  { name: 'Registeel', slug: 'registeel', gid: '689476776', pokemonId: 379, color: '#99b9c2' },
  { name: 'Tapu Bulu', slug: 'tapu-bulu', gid: '224035199', pokemonId: 787, color: '#b7ce78' },
  { name: 'Terrakion', slug: 'terrakion', gid: '640814143', pokemonId: 639, color: '#dcab87' },
  { name: 'Tornadus', slug: 'tornadus', gid: '683345424', pokemonId: 641, color: '#9fc2bc' },
  { name: 'Uxie', slug: 'uxie', gid: '1824130640', pokemonId: 480, color: '#e8d179' },
]
