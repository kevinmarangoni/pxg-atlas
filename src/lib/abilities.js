import {
  Axe,
  Brain,
  DoorOpen,
  Dumbbell,
  Feather,
  Flashlight,
  Hammer,
  PersonStanding,
  Pickaxe,
  Scissors,
  Shuffle,
  Sparkles,
  Waves,
  Wind,
} from 'lucide-react'

function normalizedAbilityKey(value) {
  return String(value || '').toLowerCase().replace(/[^a-z]/g, '')
}

const ABILITY_INFO = {
  cut: { icon: Scissors, description: 'Corta arbustos e árvores pequenas que bloqueiam o caminho.' },
  dig: { icon: Pickaxe, description: 'Cava e remove obstáculos de terra que bloqueiam o caminho.' },
  headbutt: { icon: Hammer, description: 'Golpeia árvores para derrubar itens ou abrir caminho.' },
  rocksmash: { icon: Axe, description: 'Quebra rochas que bloqueiam o caminho.' },
  light: { icon: Flashlight, description: 'Ilumina áreas escuras, como cavernas.' },
  fly: { icon: Feather, description: 'Monta o Pokémon para voar pelo cenário. Exclusiva para contas VIP.' },
  levitate: { icon: Wind, description: 'Monta o Pokémon para flutuar e voar pelo cenário.' },
  surf: { icon: Waves, description: 'Monta o Pokémon para navegar pela água. Exclusiva para contas VIP.' },
  teleport: { icon: Sparkles, description: 'Teleporta o jogador rapidamente pelo mapa. Exclusiva para contas VIP.' },
  blink: { icon: Sparkles, description: 'Teleporte de curta distância, com recarga base de 15 segundos.' },
  darkportal: { icon: DoorOpen, description: 'Abre um portal para teleporte de curta distância.' },
  ride: { icon: PersonStanding, description: 'Permite montar o Pokémon para exploração no cenário.' },
  transform: { icon: Shuffle, description: 'Transforma-se temporariamente em outro Pokémon.' },
  strength: { icon: Dumbbell, description: 'Empurra ou movimenta objetos pesados no cenário.' },
  strenght: { icon: Dumbbell, description: 'Empurra ou movimenta objetos pesados no cenário.' },
  controlmind: { icon: Brain, description: 'Controla a mente de NPCs ou Pokémon selvagens.' },
  controlminds: { icon: Brain, description: 'Controla a mente de NPCs ou Pokémon selvagens.' },
}

const FALLBACK_ABILITY_INFO = { icon: Sparkles, description: 'Habilidade de utilidade publicada na ficha.' }

export function getAbilityInfo(name) {
  return ABILITY_INFO[normalizedAbilityKey(name)] || FALLBACK_ABILITY_INFO
}
