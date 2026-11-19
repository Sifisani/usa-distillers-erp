import type { Edge, Node } from '@xyflow/react';
import {
  EnergizationStatus,
  Equipment,
  FeederPanelId,
  JobCard,
  MaintenanceCondition,
  PowerDistributionNode,
  PowerEdgeRole,
  PowerVoltageTier
} from '../../types';
import {
  FEEDER_PANELS,
  resolveEquipmentFeederInfo
} from '../master-data/powerDistributionData';
import {
  SolvedNodeState,
  SolvedTopologyResult,
  getDescendantNodeIds,
  getUpstreamNodeIds
} from './topologySolver';
import {
  AssetConditionSummary,
  resolveAssetMaintenanceCondition
} from './inspections';

export interface SldHandleSpec {
  id: string;
  type: 'source' | 'target';
  position: 'top' | 'bottom';
  leftPx: number;
}

export interface ElectricalEquipmentNodeData extends Record<string, unknown> {
  powerNode: PowerDistributionNode;
  solvedState?: SolvedNodeState;
  maintenanceCondition?: MaintenanceCondition;
  isSelected: boolean;
  isHighlightedPath: boolean;
  isSearchMatch: boolean;
  isDimmed: boolean;
  hasCollapsibleChildren: boolean;
  isExpanded: boolean;
  isHierarchyExpanded?: boolean;
  childCount: number;
  voltageTier: PowerVoltageTier;
  /** Whether C1..C3 have left+bottom handles (horizontal inlet, vertical drop to 11kV bus) */
  entrySide: 'left' | 'top';
  hasRightHandle?: boolean;
  onSelect: (nodeId: string) => void;
  onToggleExpand?: (nodeId: string) => void;
  onExpandHierarchyNode?: (nodeId: string) => void;
  onOpenNodeCondition?: (nodeId: string) => void;
}

export interface BusbarNodeData extends Record<string, unknown> {
  powerNode: PowerDistributionNode;
  solvedState?: SolvedNodeState;
  maintenanceCondition?: MaintenanceCondition;
  widthPx: number;
  voltageTier: PowerVoltageTier;
  handles: SldHandleSpec[];
  isSelected: boolean;
  isHighlightedPath: boolean;
  isSearchMatch: boolean;
  isDimmed: boolean;
  isCollapsible?: boolean;
  isExpanded?: boolean;
  isHierarchyExpanded?: boolean;
  onSelect: (nodeId: string) => void;
  onToggleExpand?: (nodeId: string) => void;
  onExpandHierarchyNode?: (nodeId: string) => void;
  onOpenNodeCondition?: (nodeId: string) => void;
}

export interface MccPanelNodeData extends Record<string, unknown> {
  panelId: FeederPanelId;
  panelCode: string;
  panelName: string;
  panelType: 'MCC' | 'DB';
  breakerId: string;
  breakerCode: string;
  location: string;
  energization: EnergizationStatus;
  breakerCondition?: MaintenanceCondition;
  equipmentConditions?: Record<string, MaintenanceCondition>;
  connectedEquipment: Equipment[];
  totalKw: number;
  liveAmps: number;
  openJobCardsCount: number;
  isSelected: boolean;
  isHighlightedPath: boolean;
  isLoadsExpanded: boolean;
  isHierarchyExpanded?: boolean;
  isSearchMatch: boolean;
  isDimmed: boolean;
  matchedEquipmentIds: string[];
  onSelectBreaker: (breakerId: string) => void;
  onToggleLoads: (panelId: FeederPanelId) => void;
  onExpandHierarchyNode?: (breakerId: string) => void;
  onInspectEquipment?: (eq: Equipment) => void;
  onOpenNodeCondition?: (nodeId: string) => void;
  onOpenEquipmentCondition?: (eq: Equipment) => void;
  onNewJobCardForEquipment?: (eq: Equipment) => void;
}

export interface ElectricalConductorEdgeData extends Record<string, unknown> {
  voltageTier: PowerVoltageTier;
  edgeRole: PowerEdgeRole;
  energization: EnergizationStatus;
  isHighlightedPath: boolean;
  isDimmed: boolean;
  label?: string;
}

export interface SldBuildOptions {
  powerNodes: PowerDistributionNode[];
  solved: SolvedTopologyResult;
  equipmentList: Equipment[];
  jobCards: JobCard[];
  conditionSummaries?: Map<string, AssetConditionSummary>;
  selectedNodeId: string | null;
  expandedHierarchyNodeId?: string | null;
  searchQuery: string;
  expandedBranchIds: Set<string>;
  expandedPanelIds: Set<FeederPanelId>;
  onSelectNode: (nodeId: string) => void;
  onToggleBranch: (nodeId: string) => void;
  onTogglePanelLoads: (panelId: FeederPanelId) => void;
  onExpandHierarchyNode?: (nodeId: string) => void;
  onInspectEquipment?: (eq: Equipment) => void;
  onOpenNodeCondition?: (nodeId: string) => void;
  onOpenEquipmentCondition?: (eq: Equipment) => void;
  onNewJobCardForEquipment?: (eq: Equipment) => void;
}

const NODE_WIDTH = 192;

interface FixedPlacement {
  x: number;
  y: number;
  entrySide?: 'left' | 'top';
  hasRightHandle?: boolean;
  voltageTier: PowerVoltageTier;
}

const CANONICAL_PLACEMENTS: Record<string, FixedPlacement> = {
  // Level 1: Power Sources & HV Incomer Breakers (horizontal source -> breaker -> vertical drop to 11kV bus)
  OLD_TURBINE: { x: 40, y: 40, entrySide: 'top', hasRightHandle: true, voltageTier: '6.3kV' },
  OLD_STEP_UP_TX: { x: 270, y: 40, entrySide: 'left', hasRightHandle: true, voltageTier: '11kV' },
  C1: { x: 500, y: 40, entrySide: 'left', voltageTier: '11kV' },

  EEC_SUPPLY: { x: 930, y: 40, entrySide: 'top', hasRightHandle: true, voltageTier: '11kV' },
  METERING_TX: { x: 1166, y: 40, entrySide: 'left', hasRightHandle: true, voltageTier: '11kV' },
  C2: { x: 1402, y: 40, entrySide: 'left', voltageTier: '11kV' },

  NEW_TURBINE: { x: 1980, y: 40, entrySide: 'top', hasRightHandle: true, voltageTier: '11kV' },
  C3: { x: 2230, y: 40, entrySide: 'left', voltageTier: '11kV' },

  // Level 2 & 3: Tx1 Leg
  TX1_FUSE: { x: 148, y: 295, entrySide: 'top', voltageTier: '11kV' },
  TX1: { x: 148, y: 430, entrySide: 'top', voltageTier: '11kV' },
  C4: { x: 148, y: 565, entrySide: 'top', hasRightHandle: true, voltageTier: '415V' },

  // Emergency Gen Set + C7 (aligned beside C4 above Tx1 Busbar)
  GEN_SET: { x: 404, y: 430, entrySide: 'top', voltageTier: '400V' },
  C7: { x: 404, y: 565, entrySide: 'top', voltageTier: '400V' },

  // Level 2 & 3: Tx2 Leg
  TX2_FUSE: { x: 1166, y: 295, entrySide: 'top', voltageTier: '11kV' },
  TX2: { x: 1166, y: 430, entrySide: 'top', voltageTier: '11kV' },
  C5: { x: 1166, y: 565, entrySide: 'top', voltageTier: '420V' },

  // Level 2 & 3: Tx3 Leg
  TX3_FUSE: { x: 2189, y: 295, entrySide: 'top', voltageTier: '11kV' },
  TX3: { x: 2189, y: 430, entrySide: 'top', voltageTier: '11kV' },
  C6: { x: 2189, y: 565, entrySide: 'top', voltageTier: '420V' },

  // Level 4A: Tx1 Feeders
  C8: { x: 40, y: 785, entrySide: 'top', voltageTier: '400V' },
  C9: { x: 258, y: 785, entrySide: 'top', voltageTier: '400V' },
  C10: { x: 476, y: 785, entrySide: 'top', voltageTier: '400V' },

  // Level 4B: Tx2 Feeders
  C11: { x: 730, y: 785, entrySide: 'top', voltageTier: '400V' },
  C12: { x: 1166, y: 785, entrySide: 'top', voltageTier: '400V' },
  C13: { x: 1602, y: 785, entrySide: 'top', voltageTier: '400V' },

  // Level 4B-sub: C12 Downstream Feeders
  C18: { x: 948, y: 960, entrySide: 'top', voltageTier: '400V' },
  C19: { x: 1166, y: 960, entrySide: 'top', voltageTier: '400V' },
  C20: { x: 1384, y: 960, entrySide: 'top', voltageTier: '400V' },

  // Level 4C: Tx3 Feeders
  C14: { x: 1860, y: 785, entrySide: 'top', voltageTier: '400V' },
  C15: { x: 2078, y: 785, entrySide: 'top', voltageTier: '400V' },
  C16: { x: 2300, y: 785, entrySide: 'top', voltageTier: '400V' },
  C17: { x: 2518, y: 785, entrySide: 'top', voltageTier: '400V' }
};

interface BusbarLayoutSpec {
  x: number;
  y: number;
  widthPx: number;
  voltageTier: PowerVoltageTier;
  handles: SldHandleSpec[];
}

const CANONICAL_BUSBARS: Record<string, BusbarLayoutSpec> = {
  BUS_11KV: {
    x: 180,
    y: 205,
    widthPx: 2360,
    voltageTier: '11kV',
    handles: [
      { id: 'top-c1', type: 'target', position: 'top', leftPx: 416 },
      { id: 'top-c2', type: 'target', position: 'top', leftPx: 1318 },
      { id: 'top-c3', type: 'target', position: 'top', leftPx: 2146 },
      { id: 'bottom-tx1', type: 'source', position: 'bottom', leftPx: 64 },
      { id: 'bottom-tx2', type: 'source', position: 'bottom', leftPx: 1082 },
      { id: 'bottom-tx3', type: 'source', position: 'bottom', leftPx: 2105 }
    ]
  },
  BUS_TX1: {
    x: 40,
    y: 710,
    widthPx: 628,
    voltageTier: '400V',
    handles: [
      { id: 'top-incomer', type: 'target', position: 'top', leftPx: 204 },
      { id: 'top-genset', type: 'target', position: 'top', leftPx: 460 },
      { id: 'bottom-0', type: 'source', position: 'bottom', leftPx: 96 },
      { id: 'bottom-1', type: 'source', position: 'bottom', leftPx: 314 },
      { id: 'bottom-2', type: 'source', position: 'bottom', leftPx: 532 }
    ]
  },
  BUS_TX2: {
    x: 730,
    y: 710,
    widthPx: 1064,
    voltageTier: '400V',
    handles: [
      { id: 'top-incomer', type: 'target', position: 'top', leftPx: 532 },
      { id: 'bottom-0', type: 'source', position: 'bottom', leftPx: 96 },
      { id: 'bottom-1', type: 'source', position: 'bottom', leftPx: 532 },
      { id: 'bottom-2', type: 'source', position: 'bottom', leftPx: 968 }
    ]
  },
  BUS_TX3: {
    x: 1860,
    y: 710,
    widthPx: 850,
    voltageTier: '400V',
    handles: [
      { id: 'top-incomer', type: 'target', position: 'top', leftPx: 425 },
      { id: 'bottom-0', type: 'source', position: 'bottom', leftPx: 96 },
      { id: 'bottom-1', type: 'source', position: 'bottom', leftPx: 314 },
      { id: 'bottom-2', type: 'source', position: 'bottom', leftPx: 536 },
      { id: 'bottom-3', type: 'source', position: 'bottom', leftPx: 754 }
    ]
  }
};

function getPanelType(panelId: FeederPanelId): 'MCC' | 'DB' {
  if (
    panelId === 'MCC 1' ||
    panelId === 'MCC 2' ||
    panelId === 'MCC 3' ||
    panelId === 'MCC 4' ||
    panelId === 'Old Water Treatment Plant' ||
    panelId === 'New Water Treatment Plant'
  ) {
    return 'MCC';
  }
  return 'DB';
}

export function buildSldDiagramElements(opts: SldBuildOptions): {
  nodes: Node[];
  edges: Edge[];
  matchedNodeIds: string[];
} {
  const {
    powerNodes,
    solved,
    equipmentList,
    jobCards,
    conditionSummaries = new Map(),
    selectedNodeId,
    expandedHierarchyNodeId,
    searchQuery,
    expandedBranchIds,
    expandedPanelIds,
    onSelectNode,
    onToggleBranch,
    onTogglePanelLoads,
    onExpandHierarchyNode,
    onInspectEquipment,
    onOpenNodeCondition,
    onOpenEquipmentCondition,
    onNewJobCardForEquipment
  } = opts;

  const nodeMap = new Map(powerNodes.map(n => [n.id, n]));
  const query = searchQuery.trim().toLowerCase();

  // Compute highlight chains for selected or expanded hierarchy node
  const focusNodeId = expandedHierarchyNodeId || selectedNodeId;
  const highlightedIds = new Set<string>();
  if (focusNodeId && nodeMap.has(focusNodeId)) {
    const up = getUpstreamNodeIds(focusNodeId, solved.edges);
    const down = getDescendantNodeIds(focusNodeId, solved.edges);
    up.forEach(id => highlightedIds.add(id));
    down.forEach(id => highlightedIds.add(id));
  }

  // Group equipment by canonical feeder panel
  const equipmentByPanel = new Map<FeederPanelId, Equipment[]>();
  FEEDER_PANELS.forEach(p => equipmentByPanel.set(p.id, []));
  for (const eq of equipmentList) {
    const info = resolveEquipmentFeederInfo(eq);
    const list = equipmentByPanel.get(info.feederPanel) || [];
    list.push(eq);
    equipmentByPanel.set(info.feederPanel, list);
  }

  // Search matching across power nodes & connected motors
  const matchedNodeSet = new Set<string>();
  const matchedEquipmentByPanel = new Map<FeederPanelId, string[]>();

  if (query) {
    for (const pn of powerNodes) {
      const hitNode =
        pn.code.toLowerCase().includes(query) ||
        pn.name.toLowerCase().includes(query) ||
        pn.brand.toLowerCase().includes(query) ||
        pn.model.toLowerCase().includes(query) ||
        (pn.feederPanelId && pn.feederPanelId.toLowerCase().includes(query));
      if (hitNode) {
        matchedNodeSet.add(pn.id);
      }
    }

    for (const [panelId, eqs] of equipmentByPanel.entries()) {
      const hits = eqs.filter(
        eq =>
          eq.code.toLowerCase().includes(query) ||
          eq.name.toLowerCase().includes(query) ||
          (eq.plantArea && eq.plantArea.toLowerCase().includes(query))
      );
      if (hits.length > 0) {
        matchedEquipmentByPanel.set(
          panelId,
          hits.map(h => h.id)
        );
        const panelMeta = FEEDER_PANELS.find(p => p.id === panelId);
        if (panelMeta) {
          matchedNodeSet.add(panelMeta.breakerId);
          matchedNodeSet.add(`mcc-${panelId}`);
        }
      }
    }
  }

  // Determine branch visibility based on collapsible nodes (C12, BUS_TX1, BUS_TX2, BUS_TX3)
  const isC12Expanded = expandedBranchIds.has('C12');
  const isTx1Expanded = expandedBranchIds.has('BUS_TX1');
  const isTx2Expanded = expandedBranchIds.has('BUS_TX2');
  const isTx3Expanded = expandedBranchIds.has('BUS_TX3');

  const isNodeVisible = (id: string): boolean => {
    if (['C7', 'GEN_SET', 'C8', 'C9', 'C10'].includes(id) && !isTx1Expanded) return false;
    if (['C11', 'C12', 'C13'].includes(id) && !isTx2Expanded) return false;
    if (['C18', 'C19', 'C20'].includes(id) && (!isTx2Expanded || !isC12Expanded)) return false;
    if (['C14', 'C15', 'C16', 'C17'].includes(id) && !isTx3Expanded) return false;
    return true;
  };

  const rfNodes: Node[] = [];
  const placedPositions = new Map<string, { x: number; y: number }>();

  // 1. Place canonical busbar nodes
  for (const [busId, layout] of Object.entries(CANONICAL_BUSBARS)) {
    const pn = nodeMap.get(busId);
    if (!pn) continue;
    const busIsCollapsible = busId !== 'BUS_11KV';
    const busExpanded =
      busId === 'BUS_TX1'
        ? isTx1Expanded
        : busId === 'BUS_TX2'
        ? isTx2Expanded
        : busId === 'BUS_TX3'
        ? isTx3Expanded
        : true;

    const data: BusbarNodeData = {
      powerNode: pn,
      solvedState: solved.nodeStates.get(busId),
      maintenanceCondition: resolveAssetMaintenanceCondition(
        busId,
        conditionSummaries,
        pn.operatingState === 'DECOMMISSIONED'
      ),
      widthPx: layout.widthPx,
      voltageTier: layout.voltageTier,
      handles: layout.handles,
      isSelected: selectedNodeId === busId,
      isHighlightedPath: highlightedIds.has(busId),
      isSearchMatch: matchedNodeSet.has(busId),
      isDimmed: Boolean(query && !matchedNodeSet.has(busId)),
      isCollapsible: busIsCollapsible,
      isExpanded: busExpanded,
      isHierarchyExpanded: expandedHierarchyNodeId === busId,
      onSelect: onSelectNode,
      onToggleExpand: busIsCollapsible ? onToggleBranch : undefined,
      onExpandHierarchyNode,
      onOpenNodeCondition
    };

    rfNodes.push({
      id: busId,
      type: 'busbarNode',
      position: { x: layout.x, y: layout.y },
      data,
      draggable: false,
      selectable: true
    });
    placedPositions.set(busId, { x: layout.x, y: layout.y });
  }

  // 2. Place canonical equipment / breaker / transformer / source nodes
  for (const [nodeId, layout] of Object.entries(CANONICAL_PLACEMENTS)) {
    const pn = nodeMap.get(nodeId);
    if (!pn || !isNodeVisible(nodeId)) continue;

    const isC12 = nodeId === 'C12';
    const data: ElectricalEquipmentNodeData = {
      powerNode: pn,
      solvedState: solved.nodeStates.get(nodeId),
      maintenanceCondition: resolveAssetMaintenanceCondition(
        nodeId,
        conditionSummaries,
        pn.operatingState === 'DECOMMISSIONED'
      ),
      isSelected: selectedNodeId === nodeId,
      isHighlightedPath: highlightedIds.has(nodeId),
      isSearchMatch: matchedNodeSet.has(nodeId),
      isDimmed: Boolean(query && !matchedNodeSet.has(nodeId)),
      hasCollapsibleChildren: isC12,
      isExpanded: isC12 ? isC12Expanded : false,
      isHierarchyExpanded: expandedHierarchyNodeId === nodeId,
      childCount: isC12 ? 3 : 0,
      voltageTier: layout.voltageTier,
      entrySide: layout.entrySide || 'top',
      hasRightHandle: layout.hasRightHandle,
      onSelect: onSelectNode,
      onToggleExpand: isC12 ? onToggleBranch : undefined,
      onExpandHierarchyNode,
      onOpenNodeCondition
    };

    rfNodes.push({
      id: nodeId,
      type: 'electricalEquipmentNode',
      position: { x: layout.x, y: layout.y },
      data,
      draggable: false,
      selectable: true
    });
    placedPositions.set(nodeId, { x: layout.x, y: layout.y });
  }

  // 3. Place any custom Firestore nodes not in canonical dictionary
  const customChildIndex = new Map<string, number>();
  for (const pn of powerNodes) {
    if (CANONICAL_BUSBARS[pn.id] || CANONICAL_PLACEMENTS[pn.id]) continue;
    const parentPos = pn.parentNodeId ? placedPositions.get(pn.parentNodeId) : undefined;
    const idx = customChildIndex.get(pn.parentNodeId || 'ROOT') || 0;
    customChildIndex.set(pn.parentNodeId || 'ROOT', idx + 1);

    const x = parentPos ? parentPos.x + idx * 218 : 40 + idx * 218;
    const y = parentPos ? parentPos.y + 170 : 1260;

    const tier: PowerVoltageTier =
      pn.transformerSource === 'HV_11KV' || pn.voltage.includes('11 kV') ? '11kV' : '400V';

    const data: ElectricalEquipmentNodeData = {
      powerNode: pn,
      solvedState: solved.nodeStates.get(pn.id),
      maintenanceCondition: resolveAssetMaintenanceCondition(
        pn.id,
        conditionSummaries,
        pn.operatingState === 'DECOMMISSIONED'
      ),
      isSelected: selectedNodeId === pn.id,
      isHighlightedPath: highlightedIds.has(pn.id),
      isSearchMatch: matchedNodeSet.has(pn.id),
      isDimmed: Boolean(query && !matchedNodeSet.has(pn.id)),
      hasCollapsibleChildren: false,
      isExpanded: false,
      childCount: 0,
      voltageTier: tier,
      entrySide: 'top',
      onSelect: onSelectNode,
      onOpenNodeCondition
    };

    rfNodes.push({
      id: pn.id,
      type: 'electricalEquipmentNode',
      position: { x, y },
      data,
      draggable: false,
      selectable: true
    });
    placedPositions.set(pn.id, { x, y });
  }

  // 4. Place MCC / Distribution Board panel nodes directly below each visible feeder breaker
  const rfEdges: Edge[] = [];
  const openJobCards = jobCards.filter(
    jc => jc.status !== 'Completed' && jc.status !== 'Cancelled'
  );

  for (const panel of FEEDER_PANELS) {
    if (!isNodeVisible(panel.breakerId)) continue;
    const breakerPos = placedPositions.get(panel.breakerId);
    if (!breakerPos) continue;

    const breakerNode = nodeMap.get(panel.breakerId);
    const breakerSolved = solved.nodeStates.get(panel.breakerId);
    const eqs = equipmentByPanel.get(panel.id) || [];
    const totalKw = eqs.reduce((sum, eq) => sum + (Number(eq.powerKw) || 0), 0);
    const liveAmps = breakerSolved?.effectiveDisplayAmps ?? 0;
    const panelOpenJCs = openJobCards.filter(jc =>
      eqs.some(
        eq =>
          jc.equipmentId === eq.id ||
          (jc.equipmentName && eq.name && jc.equipmentName.toLowerCase() === eq.name.toLowerCase())
      )
    ).length;

    const panelNodeId = `mcc-${panel.id}`;
    const energization: EnergizationStatus =
      breakerSolved?.energization ||
      (breakerNode?.operatingState === 'CLOSED' ? 'ENERGIZED' : 'DE_ENERGIZED');
    const isLoadsExpanded = expandedPanelIds.has(panel.id);
    const matchedEqIds = matchedEquipmentByPanel.get(panel.id) || [];

    const equipmentConditions: Record<string, MaintenanceCondition> = {};
    for (const eq of eqs) {
      equipmentConditions[eq.id] = resolveAssetMaintenanceCondition(
        eq.id,
        conditionSummaries,
        eq.status === 'Decommissioned'
      );
    }

    const panelData: MccPanelNodeData = {
      panelId: panel.id,
      panelCode: panel.code,
      panelName: panel.name,
      panelType: getPanelType(panel.id),
      breakerId: panel.breakerId,
      breakerCode: panel.breakerCode,
      location: panel.location,
      energization,
      breakerCondition: resolveAssetMaintenanceCondition(
        panel.breakerId,
        conditionSummaries,
        breakerNode?.operatingState === 'DECOMMISSIONED'
      ),
      equipmentConditions,
      connectedEquipment: eqs,
      totalKw: Number(totalKw.toFixed(1)),
      liveAmps: Number(liveAmps.toFixed(1)),
      openJobCardsCount: panelOpenJCs,
      isSelected: selectedNodeId === panel.breakerId,
      isHighlightedPath: highlightedIds.has(panel.breakerId),
      isLoadsExpanded,
      isHierarchyExpanded: expandedHierarchyNodeId === panel.breakerId,
      isSearchMatch: matchedNodeSet.has(panelNodeId) || matchedEqIds.length > 0,
      isDimmed: Boolean(query && !matchedNodeSet.has(panelNodeId) && !matchedNodeSet.has(panel.breakerId)),
      matchedEquipmentIds: matchedEqIds,
      onSelectBreaker: onSelectNode,
      onToggleLoads: onTogglePanelLoads,
      onExpandHierarchyNode,
      onInspectEquipment,
      onOpenNodeCondition,
      onOpenEquipmentCondition,
      onNewJobCardForEquipment
    };

    const panelY = breakerPos.y + 150;
    rfNodes.push({
      id: panelNodeId,
      type: 'mccPanelNode',
      position: { x: breakerPos.x, y: panelY },
      data: panelData,
      draggable: false,
      selectable: false
    });

    // Edge connecting Feeder Breaker -> MCC / DB Panel
    const edgeHighlight = highlightedIds.has(panel.breakerId);
    rfEdges.push({
      id: `E-${panel.breakerId}-${panelNodeId}`,
      source: panel.breakerId,
      target: panelNodeId,
      sourceHandle: 'bottom',
      targetHandle: 'top',
      type: 'electricalConductorEdge',
      data: {
        voltageTier: '400V',
        edgeRole: 'PRIMARY_FEED',
        energization,
        isHighlightedPath: edgeHighlight,
        isDimmed: Boolean(query && !matchedNodeSet.has(panelNodeId) && !matchedNodeSet.has(panel.breakerId))
      } satisfies ElectricalConductorEdgeData
    });
  }

  // 5. Build all authoritative & custom power edges between visible power nodes
  for (const edge of solved.edges) {
    if (!placedPositions.has(edge.source) || !placedPositions.has(edge.target)) continue;

    // For GEN_SET -> C7, C7 is below GEN_SET in our clean layout (sourceHandle bottom -> targetHandle top)
    // For C7 -> BUS_TX1, bottom of C7 connects to top-genset handle of BUS_TX1
    const edgeEnergization = solved.edgeStates.get(edge.id) || 'DE_ENERGIZED';
    const isHighlighted =
      highlightedIds.has(edge.source) && highlightedIds.has(edge.target);
    const isEdgeDimmed = Boolean(
      query && !matchedNodeSet.has(edge.source) && !matchedNodeSet.has(edge.target)
    );

    const edgeData: ElectricalConductorEdgeData = {
      voltageTier: edge.voltageTier,
      edgeRole: edge.edgeRole,
      energization: edgeEnergization,
      isHighlightedPath: isHighlighted,
      isDimmed: isEdgeDimmed,
      label: edge.label
    };

    rfEdges.push({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
      type: 'electricalConductorEdge',
      data: edgeData,
      zIndex: edge.edgeRole === 'INTERLOCK_TIE' ? 20 : isHighlighted ? 15 : 5
    });
  }

  return {
    nodes: rfNodes,
    edges: rfEdges,
    matchedNodeIds: Array.from(matchedNodeSet)
  };
}

export { NODE_WIDTH };
