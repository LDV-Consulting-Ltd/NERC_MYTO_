'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import EndpointMatrix from '@/components/EndpointMatrix';
import AdminConsole from '@/components/preview/views/AdminConsole';
import AgentConsole from '@/components/preview/views/AgentConsole';
import {
  ApisView,
  ArchitectureView,
  CoverageView,
  DatasetsView,
  GovernanceView,
  LineageView,
  MetadataView,
  ObservabilityView,
} from '@/components/preview/views/Catalog';
import CommitmentsExplorer from '@/components/preview/views/CommitmentsExplorer';
import DiscoDirectory from '@/components/preview/views/DiscoDirectory';
import DiscoProfile from '@/components/preview/views/DiscoProfile';
import FeederMap from '@/components/preview/views/FeederMap';
import GeocodingReview from '@/components/preview/views/GeocodingReview';
import NationalOverview from '@/components/preview/views/NationalOverview';
import OperationsConsole from '@/components/preview/views/OperationsConsole';
import QualityReview from '@/components/preview/views/QualityReview';
import RegulatoryOrders from '@/components/preview/views/RegulatoryOrders';
import RunDetail from '@/components/preview/views/RunDetail';
import RunsList from '@/components/preview/views/RunsList';
import Warehouse from '@/components/preview/views/Warehouse';
import { StateBlock } from '@/components/preview/ui';

export default function FixturePage() {
  const pathname = usePathname() ?? '/preview/fixtures';
  const rest = pathname.replace(/^\/preview\/fixtures\/?/, '').replace(/\/$/, '');

  if (rest.startsWith('discos/')) return <DiscoProfile />;
  if (rest.startsWith('operations/runs/') && rest !== 'operations/runs') return <RunDetail />;
  if (rest === 'warehouse/bronze') return <Warehouse layer="bronze" />;
  if (rest === 'warehouse/silver') return <Warehouse layer="silver" />;
  if (rest === 'warehouse/gold') return <Warehouse layer="gold" />;
  if (rest === 'catalog/coverage') {
    return (
      <>
        <CoverageView />
        <EndpointMatrix />
      </>
    );
  }

  const views: Record<string, ReactNode> = {
    '': <NationalOverview />,
    commitments: <CommitmentsExplorer />,
    discos: <DiscoDirectory />,
    map: <FeederMap />,
    orders: <RegulatoryOrders />,
    operations: <OperationsConsole />,
    'operations/runs': <RunsList />,
    'operations/quality': <QualityReview />,
    'operations/geocoding': <GeocodingReview />,
    catalog: <DatasetsView />,
    'catalog/metadata': <MetadataView />,
    'catalog/governance': <GovernanceView />,
    'catalog/lineage': <LineageView />,
    'catalog/architecture': <ArchitectureView />,
    'catalog/observability': <ObservabilityView />,
    'catalog/apis': <ApisView />,
    agent: <AgentConsole />,
    admin: <AdminConsole />,
  };

  return views[rest] ?? (
    <StateBlock tone="awaiting" title="This sample screen is not available.">
      Use the live console link in the banner.
    </StateBlock>
  );
}
