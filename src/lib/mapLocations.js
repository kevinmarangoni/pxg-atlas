export const RESPAWN_PROXIMITY = 120

export function mapLocationFloor(location) {
  return Number.isFinite(Number(location?.floor)) ? Number(location.floor) : Number(location?.z) || 0
}

function normalizedRegion(location) {
  return String(location?.region || 'Região não informada').trim().toLocaleLowerCase('pt-BR')
}

function groupBucket(locations, proximity) {
  const parents = locations.map((_, index) => index)
  const find = (index) => {
    let root = index
    while (parents[root] !== root) root = parents[root]
    while (parents[index] !== index) {
      const parent = parents[index]
      parents[index] = root
      index = parent
    }
    return root
  }
  const union = (left, right) => {
    const leftRoot = find(left)
    const rightRoot = find(right)
    if (leftRoot !== rightRoot) parents[rightRoot] = leftRoot
  }
  const maximumDistanceSquared = proximity ** 2

  for (let left = 0; left < locations.length; left += 1) {
    for (let right = left + 1; right < locations.length; right += 1) {
      const distanceSquared = ((locations[left].x - locations[right].x) ** 2) + ((locations[left].y - locations[right].y) ** 2)
      if (distanceSquared <= maximumDistanceSquared) union(left, right)
    }
  }

  const groups = new Map()
  locations.forEach((location, index) => {
    const root = find(index)
    const members = groups.get(root) || []
    members.push(location)
    groups.set(root, members)
  })
  return [...groups.values()]
}

function representativeLocation(members) {
  const centerX = members.reduce((total, location) => total + location.x, 0) / members.length
  const centerY = members.reduce((total, location) => total + location.y, 0) / members.length
  return members.reduce((nearest, location) => {
    const distance = ((location.x - centerX) ** 2) + ((location.y - centerY) ** 2)
    return !nearest || distance < nearest.distance ? { location, distance } : nearest
  }, null).location
}

export function groupNearbyRespawns(locations, proximity = RESPAWN_PROXIMITY) {
  const buckets = new Map()
  for (const location of locations || []) {
    const key = `${normalizedRegion(location)}:${mapLocationFloor(location)}`
    const bucket = buckets.get(key) || []
    bucket.push(location)
    buckets.set(key, bucket)
  }

  return [...buckets.values()]
    .flatMap((bucket) => groupBucket(bucket, proximity))
    .map((members) => {
      const representative = representativeLocation(members)
      const comments = [...new Set(members.map((location) => location.comment).filter(Boolean))]
      return {
        ...representative,
        floor: mapLocationFloor(representative),
        point_count: members.length,
        members,
        comment: members.length > 1
          ? `${members.length} pontos próximos agrupados${comments.length ? ` · ${comments[0]}` : ''}`
          : representative.comment,
        map_uid: `respawn:${normalizedRegion(representative)}:${mapLocationFloor(representative)}:${representative.x}:${representative.y}`,
      }
    })
    .sort((left, right) => String(left.region || '').localeCompare(String(right.region || ''), 'pt-BR')
      || mapLocationFloor(left) - mapLocationFloor(right)
      || left.x - right.x
      || left.y - right.y)
}
