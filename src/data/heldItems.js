export const HELD_ITEMS_SOURCE = 'https://wiki.pokexgames.com/index.php/Held_Itens'

const tiers = (values) => values.map((value, index) => ({ tier: index + 1, value }))

export const HELD_ICON_URLS = {
  'x-attack': 'https://wiki.pokexgames.com/images/c/ce/Attack4.png',
  'x-critical': 'https://wiki.pokexgames.com/images/2/21/Critical4.png',
  'x-boost': 'https://wiki.pokexgames.com/images/c/cd/Boost.png',
  'x-defense': 'https://wiki.pokexgames.com/images/b/b2/Defense4.png',
  'x-block': 'https://wiki.pokexgames.com/images/0/06/Block4.png',
  'x-vitality': 'https://wiki.pokexgames.com/images/b/be/Vitality.png',
  'x-harden': 'https://wiki.pokexgames.com/images/0/02/Harden.png',
  'x-lucky': 'https://wiki.pokexgames.com/images/0/0b/Lucky4.png',
  'x-experience': 'https://wiki.pokexgames.com/images/e/e1/Experience.png',
  'x-accuracy': 'https://wiki.pokexgames.com/images/4/4c/Accuracy.png',
  'x-return': 'https://wiki.pokexgames.com/images/6/6f/Return.png',
  'x-poison': 'https://wiki.pokexgames.com/images/0/05/Poison.png',
  'x-hellfire': 'https://wiki.pokexgames.com/images/4/4e/Hellfire.png',
  'x-rage': 'https://wiki.pokexgames.com/images/2/27/Rage.png',
  'x-strafe': 'https://wiki.pokexgames.com/images/a/af/Strafe.png',
  'x-agility': 'https://wiki.pokexgames.com/images/1/14/Agility.png',
  'x-haste': 'https://wiki.pokexgames.com/images/3/35/Haste.png',
  'x-elemental': 'https://wiki.pokexgames.com/images/3/39/Elemental.png',
  'x-cooldown': 'https://wiki.pokexgames.com/images/7/7d/X-coldown.png',
  'x-blink': 'https://wiki.pokexgames.com/images/5/5c/X-blink.png',
  'y-teleport': 'https://wiki.pokexgames.com/images/e/e8/Teleport.png',
  'y-wing': 'https://wiki.pokexgames.com/images/1/16/YWing.png',
  'y-cure': 'https://wiki.pokexgames.com/images/7/7b/Cure.png',
  'y-control': 'https://wiki.pokexgames.com/images/e/e5/Control.png',
  'y-regeneration': 'https://wiki.pokexgames.com/images/5/53/Regeneration.png',
  'y-antiburn': 'https://wiki.pokexgames.com/images/f/f0/Antiburn.png',
  'y-antipoison': 'https://wiki.pokexgames.com/images/4/43/Antipoison.png',
  'y-ghost': 'https://wiki.pokexgames.com/images/a/ab/Ghost.png',
  'y-light': 'https://wiki.pokexgames.com/images/a/a6/Light.png',
  'y-headbutt': 'https://wiki.pokexgames.com/images/1/1a/Headbutt.png',
  'y-dig': 'https://wiki.pokexgames.com/images/e/ef/Dig.png',
  'y-smash': 'https://wiki.pokexgames.com/images/2/29/Smash.png',
  'y-cut': 'https://wiki.pokexgames.com/images/8/8f/Cut.png',
  'y-antiself': 'https://wiki.pokexgames.com/images/b/b3/Antiself.png',
  'y-blur': 'https://wiki.pokexgames.com/images/f/f4/Blur.png',
}

const HELD_DEFINITIONS = [
  { id: 'x-attack', slot: 'x', name: 'X-Attack', category: 'Combate', unit: '% de força', tiers: tiers([8, 12, 16, 19, 22, 25, 28, 31]), description: 'Aumenta a força do Pokémon.', plannerEffect: 'attack' },
  { id: 'x-critical', slot: 'x', name: 'X-Critical', category: 'Combate', unit: '% de crítico', tiers: tiers([8, 10, 12, 14, 16, 20, 24, 27]), description: 'Aumenta a chance de acerto crítico.' },
  { id: 'x-boost', slot: 'x', name: 'X-Boost', category: 'Combate', unit: 'níveis', tiers: tiers([6, 8, 10, 12, 14, 16, 18]), description: 'Concede vida equivalente ao valor e o dobro como bônus de ataque.', plannerEffect: 'boost' },
  { id: 'x-defense', slot: 'x', name: 'X-Defense', category: 'Combate', unit: '% de defesa', tiers: tiers([8, 10, 12, 14, 16, 20, 24, 27]), description: 'Aumenta a defesa do Pokémon.' },
  { id: 'x-block', slot: 'x', name: 'X-Block', category: 'Combate', unit: '% de bloqueio', tiers: tiers([6, 8, 10, 12, 14, 18, 22, 25]), description: 'Aumenta a chance de bloquear ataques.' },
  { id: 'x-vitality', slot: 'x', name: 'X-Vitality', category: 'Combate', unit: '% de vida', tiers: tiers([5, 8, 12, 15, 19, 22, 25]), description: 'Aumenta a vida do Pokémon.' },
  { id: 'x-harden', slot: 'x', name: 'X-Harden', category: 'Combate', unit: 's', tiers: tiers([4, 7, 10, 13, 16, 19, 22]), description: 'Reduz o dano recebido por um período.' },
  { id: 'x-lucky', slot: 'x', name: 'X-Lucky', category: 'Hunt', unit: '% de drop', tiers: tiers([10, 20, 35, 50, 65, 80, 100, null, 150]), description: 'Aumenta a chance de drop; não aumenta o dano.' },
  { id: 'x-experience', slot: 'x', name: 'X-Experience', category: 'Hunt', unit: '% de experiência', tiers: tiers([10, 15, 20, 25, 30, 35, 40]), description: 'Aumenta a experiência recebida.' },
  { id: 'x-accuracy', slot: 'x', name: 'X-Accuracy', category: 'Utilidade', unit: 'precisão', tiers: tiers([20, 25, 30, 35, 40, 45, 50]), description: 'Aumenta a precisão de efeitos de status.' },
  { id: 'x-return', slot: 'x', name: 'X-Return', category: 'Hunt', unit: '% de retorno', tiers: tiers([2.5, 3, 4, 5, 6, 7, 9]), description: 'Devolve parte do dano; contra selvagens o valor é multiplicado por dez.' },
  { id: 'x-poison', slot: 'x', name: 'X-Poison', category: 'Dano contínuo', unit: '% de dano', tiers: tiers([90, 125, 160, 195, 230, 265, 300]), description: 'Aumenta o dano do status Poison.' },
  { id: 'x-hellfire', slot: 'x', name: 'X-Hellfire', category: 'Dano contínuo', unit: '% de dano', tiers: tiers([90, 125, 160, 195, 230, 265, 300]), description: 'Aumenta o dano do status Burn.' },
  { id: 'x-rage', slot: 'x', name: 'X-Rage', category: 'Utilidade', unit: '% de chance', tiers: tiers([10, 20, 30, 40, 50, 70, 100]), description: 'Concede chance de usar o ataque Rage.' },
  { id: 'x-strafe', slot: 'x', name: 'X-Strafe', category: 'Utilidade', unit: '% de chance', tiers: tiers([10, 20, 30, 40, 50, 70, 100]), description: 'Concede chance de usar o ataque Strafe.' },
  { id: 'x-agility', slot: 'x', name: 'X-Agility', category: 'Utilidade', unit: '% de chance', tiers: tiers([8, 14, 20, 30, 40, 50, 60]), description: 'Concede chance de usar o ataque Agility.' },
  { id: 'x-haste', slot: 'x', name: 'X-Haste', category: 'Utilidade', unit: 'valor', tiers: tiers([60, 85, 110, 135, 170, 205, 250]), description: 'Potencializa a habilidade Haste.' },
  { id: 'x-elemental', slot: 'x', name: 'X-Elemental', category: 'Combate', unit: '% de chance', tiers: tiers([8, 10, 12, 14, 17, 19, 22]), description: 'Concede chance de usar uma passiva do elemento do Pokémon.' },
  { id: 'x-cooldown', slot: 'x', name: 'X-Cooldown', category: 'Utilidade', unit: '%', tiers: [{ tier: 3, value: 11 }, { tier: 5, value: 14 }, { tier: 7, value: 17 }], description: 'Reduz cooldown; não afeta movimentos de até 10 segundos.' },
  { id: 'x-blink', slot: 'x', name: 'X-Blink', category: 'Utilidade', unit: '%', tiers: [{ tier: 5, value: 70 }], description: 'Reduz o cooldown da habilidade Blink.' },
  { id: 'y-teleport', slot: 'y', name: 'Y-Teleport', category: 'Mobilidade', unit: 'min', tiers: tiers([5, 7, 10, 15, 20, 25, 27, 28]), description: 'Concede teleport com cooldown por tier.' },
  { id: 'y-wing', slot: 'y', name: 'Y-Wing', category: 'Mobilidade', unit: 'velocidade', tiers: tiers([100, 145, 185, 225, 270, 310, 370, 420]), description: 'Concede voo e velocidade adicional.' },
  { id: 'y-cure', slot: 'y', name: 'Y-Cure', category: 'Sustentação', unit: '% de chance', tiers: tiers([45, 55, 65, 75, 85, 95, 100]), description: 'Pode remover um status negativo; não funciona em duelo.' },
  { id: 'y-control', slot: 'y', name: 'Y-Control', category: 'Controle', unit: 's', tiers: tiers([40, 60, 80, 100, 120, 140, 160]), description: 'Reduz o cooldown de Control Mind.' },
  { id: 'y-regeneration', slot: 'y', name: 'Y-Regeneration', category: 'Sustentação', unit: 'vida/s', tiers: tiers([700, 1000, 1500, 2000, 3000, 4000, 5000]), description: 'Regenera vida fora de batalha; não funciona em duelo.' },
  { id: 'y-antiburn', slot: 'y', name: 'Y-Antiburn', category: 'Proteção', unit: '%', tiers: [{ tier: 6, value: 50 }], description: 'Proteção contra burn.' },
  { id: 'y-antipoison', slot: 'y', name: 'Y-Antipoison', category: 'Proteção', unit: '%', tiers: [{ tier: 4, value: 50 }], description: 'Proteção contra poison.' },
  { id: 'y-ghost', slot: 'y', name: 'Y-Ghost', category: 'Habilidade', unit: '', tiers: [], description: 'Permite atravessar paredes.' },
  { id: 'y-light', slot: 'y', name: 'Y-Light', category: 'Habilidade', unit: '', tiers: [], description: 'Ensina a habilidade Light.' },
  { id: 'y-headbutt', slot: 'y', name: 'Y-Headbutt', category: 'Habilidade', unit: '', tiers: [], description: 'Ensina a habilidade Headbutt.' },
  { id: 'y-dig', slot: 'y', name: 'Y-Dig', category: 'Habilidade', unit: '', tiers: [], description: 'Ensina a habilidade Dig.' },
  { id: 'y-smash', slot: 'y', name: 'Y-Smash', category: 'Habilidade', unit: '', tiers: [], description: 'Ensina a habilidade Rock Smash.' },
  { id: 'y-cut', slot: 'y', name: 'Y-Cut', category: 'Habilidade', unit: '', tiers: [], description: 'Ensina a habilidade Cut.' },
  { id: 'y-antiself', slot: 'y', name: 'Y-Antiself', category: 'Fusão / inativo', unit: '', tiers: [], description: 'Sem utilidade ativa; mantido apenas para fusão.' },
  { id: 'y-blur', slot: 'y', name: 'Y-Blur', category: 'Fusão / inativo', unit: '', tiers: [], description: 'Sem utilidade ativa; mantido apenas para fusão.' },
]

export const HELD_ITEMS = HELD_DEFINITIONS.map((item) => ({ ...item, iconUrl: HELD_ICON_URLS[item.id] || null }))

export const HELD_BY_ID = new Map(HELD_ITEMS.map((item) => [item.id, item]))

export function heldTierOptions(itemId) {
  return HELD_BY_ID.get(itemId)?.tiers.filter((entry) => entry.value != null) ?? []
}

export function heldTierValue(itemId, tier) {
  return HELD_BY_ID.get(itemId)?.tiers.find((entry) => entry.tier === Number(tier))?.value ?? null
}

export function xBoostValue(itemId, tier, playerLevel) {
  if (itemId !== 'x-boost') return 0
  const base = heldTierValue(itemId, tier) ?? 0
  const factor = Number(playerLevel) >= 400 ? 2.5 : Number(playerLevel) >= 150 ? 2 : Number(playerLevel) >= 100 ? 1.5 : 1
  return Math.round(base * factor)
}

export function heldEffectLabel(itemId, tier, playerLevel) {
  const item = HELD_BY_ID.get(itemId)
  if (!item) return 'Sem held'
  const value = itemId === 'x-boost' ? xBoostValue(itemId, tier, playerLevel) : heldTierValue(itemId, tier)
  if (value == null) return item.description
  return `${value}${item.unit.startsWith('%') ? '%' : ` ${item.unit}`}`
}
