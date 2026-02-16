'use client';

import { useCallback, useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  type NodeProps,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import type { LineageNodePayload, LineageEdgePayload, LineageLayer } from '@/lib/types';

const LAYER_ORDER: LineageLayer[] = ['source', 'bronze', 'silver', 'gold'];
const LAYER_COLORS: Record<LineageLayer, string> = {
  source: '#9ca3af',
  bronze: '#ea580c',
  silver: '#2563eb',
  gold: '#16a34a',
};
const LAYER_LABELS: Record<LineageLayer, string> = {
  source: 'Source',
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Warehouse',
};

const NODE_WIDTH = 160;
const NODE_HEIGHT = 44;
const LAYER_GAP = 280;
const NODE_GAP = 70;

function lineageToFlow(
  nodesPayload: LineageNodePayload[],
  edgesPayload: LineageEdgePayload[],
): { nodes: Node[]; edges: Edge[] } {
  const byLayer: Record<string, LineageNodePayload[]> = {};
  for (const n of nodesPayload) {
    const layer = n.layer || 'bronze';
    if (!byLayer[layer]) byLayer[layer] = [];
    byLayer[layer].push(n);
  }
  const nodes: Node[] = [];
  LAYER_ORDER.forEach((layer, li) => {
    const list = byLayer[layer] || [];
    list.forEach((n, i) => {
      nodes.push({
        id: n.id,
        type: 'lineageNode',
        position: { x: li * LAYER_GAP, y: i * NODE_GAP },
        data: {
          label: n.displayName,
          layer: n.layer,
          fullName: n.id,
          rowCount: n.rowCount,
          lastUpdated: n.lastUpdated,
        },
      });
    });
  });
  const edges: Edge[] = edgesPayload.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    type: 'smoothstep',
    markerEnd: { type: MarkerType.ArrowClosed },
    data: { transformName: e.transformName, runId: e.runId },
  }));
  return { nodes, edges };
}

function LineageNodeView({ data, selected }: NodeProps) {
  const layer = (data.layer as LineageLayer) || 'bronze';
  const borderColor = LAYER_COLORS[layer];
  const label = (data.label as string) || (data.fullName as string) || '?';
  const truncated = label.length > 22 ? label.slice(0, 20) + '…' : label;
  return (
    <div
      className="rounded-lg border-2 px-3 py-2 shadow-sm bg-white min-w-[120px] max-w-[180px]"
      style={{ borderColor }}
      title={`${data.fullName ?? ''}\nLayer: ${layer}\n${data.rowCount != null ? `Rows: ${data.rowCount}` : ''}\n${data.lastUpdated ? `Updated: ${data.lastUpdated}` : ''}`}
    >
      <div className="text-xs font-medium text-gray-800 truncate" style={{ color: borderColor }}>
        {truncated}
      </div>
    </div>
  );
}

const nodeTypes = { lineageNode: LineageNodeView };

function FitViewButton() {
  const { fitView } = useReactFlow();
  return (
    <button
      type="button"
      className="rounded border border-[var(--ldv-border)] bg-white px-2 py-1 text-xs font-medium text-[var(--ldv-text-primary)] hover:bg-[var(--ldv-border)]/50"
      onClick={() => fitView({ padding: 0.2 })}
    >
      Reset view
    </button>
  );
}

export interface LineageGraphProps {
  nodesPayload: LineageNodePayload[];
  edgesPayload: LineageEdgePayload[];
  onNodeClick?: (nodeId: string, tableId: string) => void;
  highlightNodeId?: string | null;
}

function LineageGraphInner({
  nodesPayload,
  edgesPayload,
  onNodeClick,
}: LineageGraphProps) {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => lineageToFlow(nodesPayload, edgesPayload),
    [nodesPayload, edgesPayload],
  );
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onNodeClickHandler = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onNodeClick?.(node.id, node.id);
    },
    [onNodeClick],
  );

  return (
    <div className="w-full h-[500px] rounded-lg border border-[var(--ldv-border)] bg-[var(--ldv-surface)]/30">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClickHandler}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={1.5}
        defaultEdgeOptions={{ style: { stroke: '#94a3b8', strokeDasharray: '4 4' } }}
      >
        <Background color="#e2e8f0" gap={16} />
        <Controls showInteractive={false} />
        <div className="absolute bottom-2 right-12 z-10">
          <FitViewButton />
        </div>
      </ReactFlow>
    </div>
  );
}

export default function LineageGraph(props: LineageGraphProps) {
  return (
    <ReactFlowProvider>
      <LineageGraphInner {...props} />
    </ReactFlowProvider>
  );
}

export function LineageLegend() {
  return (
    <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--ldv-text-muted)]">
      {LAYER_ORDER.map((layer) => (
        <span key={layer} className="flex items-center gap-1.5">
          <span
            className="w-3 h-3 rounded-full border-2 border-white shadow"
            style={{ backgroundColor: LAYER_COLORS[layer] }}
          />
          {LAYER_LABELS[layer]}
        </span>
      ))}
    </div>
  );
}
