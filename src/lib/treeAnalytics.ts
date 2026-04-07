import type { ScriptTreeData, TreeCallRecord, TreeEdge, TreeAnalytics, TreePathStat, TreeFunnelStats } from '../types/scriptTesting'

export type { TreeFunnelStats }

export function computeTreeAnalytics(
  tree: ScriptTreeData,
  treeCalls: TreeCallRecord[]
): TreeAnalytics {
  const nodeStats: TreeAnalytics['nodeStats'] = {}
  for (const node of tree.nodes) {
    nodeStats[node.id] = { nodeId: node.id, visitCount: 0, exitCount: 0, edgeTraversals: {} }
  }

  const pathCounts: Record<string, { count: number; booked: number; pathNodeIds: string[] }> = {}

  // Build edge lookup map: "fromId>toId" → edge (O(1) lookup)
  const edgeMap = new Map<string, TreeEdge>()
  for (const edge of tree.edges) {
    edgeMap.set(`${edge.fromNodeId}>${edge.toNodeId}`, edge)
  }

  for (const call of treeCalls) {
    // Visit counts
    for (const nodeId of call.pathNodeIds) {
      if (nodeStats[nodeId]) nodeStats[nodeId].visitCount++
    }
    // Exit counts
    if (nodeStats[call.terminalNodeId]) nodeStats[call.terminalNodeId].exitCount++

    // Edge traversals — O(1) lookup instead of O(n) .find()
    for (let i = 0; i < call.pathNodeIds.length - 1; i++) {
      const fromId = call.pathNodeIds[i]
      const toId = call.pathNodeIds[i + 1]
      const edge = edgeMap.get(`${fromId}>${toId}`)
      if (edge && nodeStats[fromId]) {
        nodeStats[fromId].edgeTraversals[edge.id] = (nodeStats[fromId].edgeTraversals[edge.id] ?? 0) + 1
      }
    }

    // Path frequency
    const pathKey = call.pathNodeIds.join('>')
    if (!pathCounts[pathKey]) {
      pathCounts[pathKey] = { count: 0, booked: 0, pathNodeIds: call.pathNodeIds }
    }
    pathCounts[pathKey].count++
    if (call.wasBooked) pathCounts[pathKey].booked++
  }

  const topPaths: TreePathStat[] = Object.values(pathCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map(({ pathNodeIds, count, booked }) => ({
      pathNodeIds,
      count,
      bookingRate: count > 0 ? booked / count : 0,
    }))

  const totalBooked = treeCalls.filter(c => c.wasBooked).length

  const semanticMap = new Map<string, string>()
  for (const node of tree.nodes) {
    if (node.semanticId) semanticMap.set(node.id, node.semanticId)
  }

  const hasSemanticId = (pathNodeIds: string[], id: string) =>
    pathNodeIds.some(nid => semanticMap.get(nid) === id)

  let noConnectionCalls = 0
  let reachedGkCalls = 0
  let reachedOwnerCalls = 0
  let deliveredExplainerCalls = 0
  let closedCalls = 0
  let notInOfficeCalls = 0
  let takeMessageCalls = 0

  for (const call of treeCalls) {
    if (call.noConnection) { noConnectionCalls++; continue }
    if (hasSemanticId(call.pathNodeIds, 'gatekeeper')) reachedGkCalls++
    if (hasSemanticId(call.pathNodeIds, 'owner')) reachedOwnerCalls++
    if (hasSemanticId(call.pathNodeIds, 'explainer')) deliveredExplainerCalls++
    if (hasSemanticId(call.pathNodeIds, 'close')) closedCalls++
    if (hasSemanticId(call.pathNodeIds, 'not-in-office')) notInOfficeCalls++
    if (hasSemanticId(call.pathNodeIds, 'take-a-message')) takeMessageCalls++
  }

  const totalCalls = treeCalls.length
  const connectedCalls = totalCalls - noConnectionCalls
  const bookedCalls = totalBooked

  const funnelStats: TreeFunnelStats = {
    totalCalls,
    noConnectionCalls,
    connectedCalls,
    connectionRate: totalCalls > 0 ? connectedCalls / totalCalls : 0,
    reachedGkCalls,
    reachedOwnerCalls,
    ownerRate: connectedCalls > 0 ? reachedOwnerCalls / connectedCalls : 0,
    deliveredExplainerCalls,
    closedCalls,
    bookedCalls,
    bookingRate: totalCalls > 0 ? bookedCalls / totalCalls : 0,
    notInOfficeCalls,
    takeMessageCalls,
  }

  return {
    totalCalls,
    totalBooked,
    bookingRate: totalCalls > 0 ? totalBooked / totalCalls : 0,
    nodeStats,
    topPaths,
    funnelStats,
  }
}
